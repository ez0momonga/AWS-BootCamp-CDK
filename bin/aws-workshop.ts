#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AwsWorkshopStack } from '../lib/aws-workshop-stack';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new cdk.App();
new AwsWorkshopStack(app, 'AwsWorkshopStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
