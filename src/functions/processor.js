/**
 * Handler for the processor lambda function
 */

const { execSync } = require('child_process')
const fs = require('fs')
const { dump } = require('auth0-deploy-cli')
const config = require('config')
const { SSM } = require('aws-sdk')
const del = require('del')
const logger = require('../common/logger')

const ssm = new SSM()

const REPO_PATH = config.get('REPO_PATH')
const KNOWN_HOSTS_PATH = config.get('KNOWN_HOSTS_PATH')
const PRIVATE_KEY_PATH = config.get('PRIVATE_KEY_PATH')
const GITHUB_PUBLIC_KEY = config.get('GITHUB_PUBLIC_KEY')

const execSyncOptions = {
  encoding: 'utf8',
  stdio: 'inherit'
}
const execSyncOptionsWithRepoPathCwd = {
  ...execSyncOptions,
  cwd: REPO_PATH
}

/**
 * Clones the github repository using SSH
 */
async function cloneRepository () {
  logger.info('Attempting to clone a repository')

  // Delete contents of existing operating directory
  logger.info('Clearing existing operating directory')
  execSync(`rm -rf ${config.get('OPERATING_PATH')}/*`, execSyncOptions)

  // Create the known_hosts file
  logger.info('Creating known_hosts')
  fs.writeFileSync(KNOWN_HOSTS_PATH, `github.com,${config.get('GITHUB_GIT_IPS')} ${GITHUB_PUBLIC_KEY}`)

  // Download and create the private ssh key file
  logger.info('Creating private ssh key file')
  const githubPrivateKey = await ssm.getParameter({
    Name: config.get('AWS_PS_GITHUB_PRIVATE_KEY_NAME'),
    WithDecryption: true // Decrypt outside the lambda function
  }).promise()
  fs.writeFileSync(config.get('PRIVATE_KEY_PATH'), githubPrivateKey.Parameter.Value)

  // Change permissions of the ssh key file
  logger.info('Updating permissions of private ssh key file')
  execSync(`chmod 400 ${PRIVATE_KEY_PATH}`, execSyncOptions)

  process.env.GIT_SSH_COMMAND = `ssh -o UserKnownHostsFile=${KNOWN_HOSTS_PATH} -i ${PRIVATE_KEY_PATH}`

  // Clone the repository
  logger.info('Executing clone')
  execSync(`git clone ${config.get('GITHUB_REPOSITORY_URL')} ${REPO_PATH}`, execSyncOptions)

  // Set user name and user email
  logger.info('Setting user name and email')
  execSync(`git config user.name ${config.get('GIT_USER_NAME')}`, execSyncOptionsWithRepoPathCwd)
  execSync(`git config user.email ${config.get('GIT_USER_EMAIL')}`, execSyncOptionsWithRepoPathCwd)

  logger.info('Successfully finished cloning the repository')
}

/**
 * Get the auth0 tenant configuration
 */
async function getAuth0TenantConfig () {
  const configObject = await ssm.getParameter({
    Name: config.get('AWS_PS_AUTH0_TENANT_CONFIG_NAME'),
    WithDecryption: true
  }).promise()
  return JSON.parse(configObject.Parameter.Value)
}

/**
 * Checks out a branch inside the repository
 */
async function checkoutBranch (branchName) {
  logger.info(`Switching to branch ${branchName}`)
  const remoteExists = execSync(`git ls-remote origin ${branchName}`, {
    cwd: REPO_PATH
  })
  if (!remoteExists || !remoteExists.toString().trim()) {
    execSync(`git switch --orphan ${branchName}`, {
      cwd: REPO_PATH
    })
  } else {
    execSync(`git switch ${branchName}`, {
      cwd: REPO_PATH
    })
  }
}

/**
 * Downloads the tenant configuration from Auth0
 */
async function downloadAuth0TenantConfig (domain, clientId, clientSecret, tenantName) {
  logger.info('Downloading tenant config')
  // Delete all repository contents excluding the .git folder
  await del(['**', '!.git'], {
    cwd: REPO_PATH
  })
  // Download the new config into the repository
  await dump({
    output_folder: REPO_PATH,
    format: 'directory',
    config: {
      AUTH0_DOMAIN: domain,
      AUTH0_CLIENT_ID: clientId,
      AUTH0_CLIENT_SECRET: clientSecret,
      AUTH0_KEYWORD_REPLACE_MAPPINGS: {
        AUTH0_TENANT_NAME: tenantName
      },
      AUTH0_ALLOW_DELETE: false,
      AUTH0_EXCLUDED: []
    }
  })
}

/**
 * Checks if the repository has any changes
 */
async function changesExist () {
  logger.info('Checking if changes exist in tenant config')
  const changesExist = execSync('git status -s', {
    cwd: REPO_PATH
  })
  if (!changesExist || !changesExist.toString().trim()) {
    return false
  }
  logger.info('Changes exist in tenant config')
  return true
}

/**
 * Commits changes and pushes it to the origin
 */
async function commitAndPushChanges (branchName) {
  // Stage changes
  logger.info('Staging changes')
  execSync('git add .', execSyncOptionsWithRepoPathCwd)

  // Commit changes
  logger.info('Commiting changes')
  execSync(`git commit -m '${config.get('GIT_COMMIT_MESSAGE')}'`, execSyncOptionsWithRepoPathCwd)

  // Push changes
  logger.info('Pushing changes')
  execSync(`git push -u origin ${branchName}`, execSyncOptionsWithRepoPathCwd)
}

/**
 * The handler function
 */
module.exports.handle = async () => {
  try {
    await cloneRepository()
    const tenantConfig = await getAuth0TenantConfig()
    for (const tenant of tenantConfig) {
      const branchName = tenant.branchName
      const domain = tenant.domain
      const clientId = tenant.clientId
      const clientSecret = tenant.clientSecret
      const tenantName = tenant.tenantName
      logger.info(`Starting ${tenantName}`)
      await checkoutBranch(branchName)
      await downloadAuth0TenantConfig(domain, clientId, clientSecret, tenantName)
      if (await changesExist()) {
        await commitAndPushChanges(branchName)
        logger.info('Successfully updated Auth0 tenant config to Github')
      } else {
        logger.info('No changes exist in tenant config. Skipping commit and push. Process complete.')
      }
    }
  } catch (e) {
    logger.info('Failed to update Auth0 tenant config to Github')
    logger.logFullError(e)
  }
}
