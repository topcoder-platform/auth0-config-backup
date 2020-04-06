/**
 * Constant configuration options
 */

const OPERATING_PATH = '/tmp' // The path at which to download the repository, known_hosts and private key file
const REPO_PATH = `${OPERATING_PATH}/repo` // The repository path
const AWS_PARAMETER_STORE_CONFIGS = { // Names of parameters in AWS parameter store
  dev: { // Names for dev environment
    githubPrivateKeyName: '/dev/configbackup/github/private-key',
    auth0ClientIdName: '/dev/configbackup/auth0/client-id',
    auth0ClientSecretName: '/dev/configbackup/auth0/client-secret'
  }
}
const STAGE = process.env.STAGE // Current environment

module.exports = {
  GITHUB_PUBLIC_KEY: 'ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ==', // Github's public SSH key
  OPERATING_PATH,
  REPO_PATH,
  KNOWN_HOSTS_PATH: `${OPERATING_PATH}/known_hosts`, // Path of known_hosts file
  PRIVATE_KEY_PATH: `${OPERATING_PATH}/id_rsa`, // Path of github private key file
  AWS_PARAMETER_STORE: AWS_PARAMETER_STORE_CONFIGS[STAGE] || AWS_PARAMETER_STORE_CONFIGS.dev, // Choose parameters based on current environment
  GIT_USER_NAME: 'Topcoder Developer', // User name to use in commit messages
  GIT_USER_EMAIL: 'support@topcoder.com', // User email to use in commit messages
  GITHUB_GIT_IPS: '192.30.252.0,185.199.108.0,140.82.112.0,13.114.40.48,13.229.188.59,13.234.176.102,13.234.210.38,13.236.229.21,13.237.44.5,13.250.177.223,15.164.81.167,18.194.104.89,18.195.85.27,18.228.52.138,18.228.67.229,18.231.5.6,35.159.8.160,52.192.72.89,52.64.108.95,52.69.186.44,52.74.223.119,52.78.231.108', // List of github's git ips
  GIT_COMMIT_MESSAGE: 'Updated Auth0 tenant config' // The commit message
}
