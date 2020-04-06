/**
 * Handler for the processor lambda function
 */

const { execSync } = require('child_process')
const fs = require('fs')
const { dump } = require('auth0-deploy-cli')
const config = require('config')
const AWS = require('aws-sdk')
const del = require('del')
const logger = require('../common/logger')

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

const AWS_PARAMETER_STORE = config.get('AWS_PARAMETER_STORE')
const ssm = new AWS.SSM()

// Build a promise and resolve it later when it is needed. This way, secrets will get decrypted on the first invocation and we can simply use the same value in subsequent invocations
const githubPrivateKeyPromise = ssm.getParameter({
  Name: AWS_PARAMETER_STORE.githubPrivateKeyName,
  WithDecryption: true // Decrypt outside the lambda function
}).promise()
const auth0ClientIdPromise = ssm.getParameter({
  Name: AWS_PARAMETER_STORE.auth0ClientIdName,
  WithDecryption: true
}).promise()
const auth0ClientSecretPromise = ssm.getParameter({
  Name: AWS_PARAMETER_STORE.auth0ClientSecretName,
  WithDecryption: true
}).promise()

let AUTH0_CONFIG = null

/**
 * Create the Auth0 config object
 */
async function buildAuth0Config () {
  logger.info('Building Auth0 config. Attempting to download AUTH0_CLIENT_ID and AUTH0_CLIENT_SECRET from AWS Parameter Store.')
  AUTH0_CONFIG = {
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
    AUTH0_CLIENT_SECRET: (await auth0ClientSecretPromise).Parameter.Value,
    AUTH0_CLIENT_ID: (await auth0ClientIdPromise).Parameter.Value,
    AUTH0_KEYWORD_REPLACE_MAPPINGS: JSON.parse(process.env.AUTH0_KEYWORD_REPLACE_MAPPINGS)
  }
  logger.info('Successfully built Auth0 config')
}

/**
 * Clones the github repository using SSH
 */
async function cloneRepository () {
  logger.info('Attempting to clone a repository')

  // Build config if it doesn't already exist
  if (!AUTH0_CONFIG) {
    await buildAuth0Config()
  }

  // Delete contents of existing operating directory
  logger.info('Clearing existing operating directory')
  execSync(`rm -rf ${config.get('OPERATING_PATH')}/*`, execSyncOptions)

  // Create the known_hosts file
  logger.info('Creating known_hosts')
  fs.writeFileSync(KNOWN_HOSTS_PATH, `github.com,${config.get('GITHUB_GIT_IPS')} ${GITHUB_PUBLIC_KEY}`)

  // Download and create the private ssh key file
  logger.info('Creating private ssh key file')
  fs.writeFileSync(config.get('PRIVATE_KEY_PATH'), (await githubPrivateKeyPromise).Parameter.Value)

  // Change permissions of the ssh key file
  logger.info('Updating permissions of private ssh key file')
  execSync(`chmod 400 ${PRIVATE_KEY_PATH}`, execSyncOptions)

  process.env.GIT_SSH_COMMAND = `ssh -o UserKnownHostsFile=${KNOWN_HOSTS_PATH} -i ${PRIVATE_KEY_PATH}`

  // Clone the repository
  logger.info('Executing clone')
  execSync(`git clone ${process.env.GITHUB_REPOSITORY_URL} ${REPO_PATH}`, execSyncOptions)

  // Set user name and user email
  logger.info('Setting user name and email')
  execSync(`git config user.name ${config.get('GIT_USER_NAME')}`, execSyncOptionsWithRepoPathCwd)
  execSync(`git config user.email ${config.get('GIT_USER_EMAIL')}`, execSyncOptionsWithRepoPathCwd)

  logger.info('Successfully finished cloning the repository')
}

/**
 * Checks out a branch inside the repository
 */
async function checkoutBranch () {
  logger.info(`Switching to branch ${process.env.GITHUB_REPOSITORY_BRANCH}`)
  execSync(`git checkout ${process.env.GITHUB_REPOSITORY_BRANCH}`, {
    cwd: REPO_PATH
  })
}

/**
 * Downloads the tenant configuration from Auth0
 */
async function downloadAuth0TenantConfig () {
  logger.info('Downloading tenant config')
  // Delete all repository contents excluding the .git folder
  await del(['**', '!.git'], {
    cwd: REPO_PATH
  })
  // Download the new config into the repository
  await dump({
    output_folder: REPO_PATH,
    config: AUTH0_CONFIG
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
async function commitAndPushChanges () {
  // Stage changes
  logger.info('Staging changes')
  execSync('git add .', execSyncOptionsWithRepoPathCwd)

  // Commit changes
  logger.info('Commiting changes')
  execSync(`git commit -m '${config.get('GIT_COMMIT_MESSAGE')}'`, execSyncOptionsWithRepoPathCwd)

  // Push changes
  logger.info('Pushing changes')
  execSync(`git push -u origin ${process.env.GITHUB_REPOSITORY_BRANCH}`, execSyncOptionsWithRepoPathCwd)
}

/**
 * The handler function
 */
module.exports.handle = async () => {
  try {
    await cloneRepository()
    await checkoutBranch()
    await downloadAuth0TenantConfig()
    if (await changesExist()) {
      await commitAndPushChanges()
      logger.info('Successfully updated Auth0 tenant config to Github')
    } else {
      logger.info('No changes exist in tenant config. Skipping commit and push. Process complete.')
    }
  } catch (e) {
    logger.info('Failed to update Auth0 tenant config to Github')
    logger.logFullError(e)
  }
}
