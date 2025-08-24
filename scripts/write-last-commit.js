// This script writes the latest commit info to .last_commit.txt for use in the version page
const { execSync } = require('child_process');
const fs = require('fs');

try {
  const commit = execSync('git log -1 --pretty=format:"%h %s (%an, %ad)" --date=short', { encoding: 'utf-8' });
  fs.writeFileSync('./.last_commit.txt', commit);
  console.log('Last commit info written to .last_commit.txt');
} catch (e) {
  console.error('Failed to write last commit info:', e);
}
