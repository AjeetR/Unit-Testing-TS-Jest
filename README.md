# README #

This README would normally document whatever steps are necessary to get your application up and running.

## Getting Started

The easiest way to get started is to clone the repository:

```
# Get the latest snapshot
git clone git@bitbucket.org:hydrantid/acm-config-manager.git

# Change directory
cd acm-config-manager

# Install NPM dependencies
npm install
```

### Configuration ###

#Get access to AWS S3 Bucket : s3://identrust-worker-dev/accounts.json

#Generate ACCESSKEYID & SECRETACCESSKEY from AWS IAM and save them as environment variables

#Build application 
npm run build

#Run the application
npm run start

App is listeneing on http://localhost:3010
Swagger-Document is on http://localhost:3010/identrust/swagger

Refer Swagger-Doc for API end points.

### Running Tests ###

Install aws-cli --> open command prompt as Admin
>> msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi

>> aws --version
aws-cli/2.9.13 Python/3.9.11 Windows/10 exe/AMD64 prompt/off

>> aws configure
AWS Access Key ID [None]: AccessKeyId <Enter your actual AccessKeyId>
AWS Secret Access Key [None]: SecretKey <Enter your actual SecretKey>
Default region name [None]: ab-abcd-1 <Enter your actual region>
Default output format [None]: json

C:\ACM\acm-config-manager> npm run test

### Contribution guidelines ###

* Writing tests
* Code review
* Other guidelines

### Who do I talk to? ###

* Repo owner or admin
* Other community or team contact