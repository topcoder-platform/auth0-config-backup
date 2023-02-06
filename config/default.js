/**
 * Constant configuration options
 */

const OPERATING_PATH = '/tmp' // The path at which to download the repository, known_hosts and private key file
const REPO_PATH = `${OPERATING_PATH}/repo` // The repository path
const KNOWN_HOSTS_PATH = `${OPERATING_PATH}/known_hosts` // Path of known_hosts file
const PRIVATE_KEY_PATH = `${OPERATING_PATH}/id_rsa` // Path of github private key file

module.exports = {
  OPERATING_PATH,
  REPO_PATH,
  KNOWN_HOSTS_PATH,
  PRIVATE_KEY_PATH,
  AWS_PS_GITHUB_PRIVATE_KEY_NAME: '/auth0-config-backup/github-private-key',
  AWS_PS_GITHUB_PUBLIC_KEY_NAME: '/auth0-config-backup/github-public-key',
  AWS_PS_AUTH0_TENANT_CONFIG_NAME: '/auth0-config-backup/auth0-tenant-config',
  GITHUB_REPOSITORY_URL: 'git@github.com:appirio-tech/auth0-config.git',
  GIT_USER_NAME: 'Topcoder Developer', // User name to use in commit messages
  GIT_USER_EMAIL: 'support@topcoder.com', // User email to use in commit messages
  // GITHUB_GIT_IPS: '192.30.252.0,185.199.108.0,140.82.112.0,13.114.40.48,13.229.188.59,13.234.176.102,13.234.210.38,13.236.229.21,13.237.44.5,13.250.177.223,15.164.81.167,18.194.104.89,18.195.85.27,18.228.52.138,18.228.67.229,18.231.5.6,35.159.8.160,52.192.72.89,52.64.108.95,52.69.186.44,52.74.223.119,52.78.231.108', // List of github's git ips
  GITHUB_GIT_IPS: '*.*.*.*',
  GIT_COMMIT_MESSAGE: 'Updated Auth0 tenant config' // The commit message
}
