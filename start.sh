cd /tmp

# try to remove the repo if it already exists
rm -rf  ChefCloudRealTime; true

# git clone https://freedonaab:tiofe32is@github.com/freedonaab/ChefCloudRealTime.git
git clone https://github.com/freedonaab/ChefCloudRealTime.git

cd ChefCloudRealTime

npm install

nodejs ./server/app.js