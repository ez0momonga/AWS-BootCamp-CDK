#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AwsWorkshopStack } from '../lib/aws-workshop-stack';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new cdk.App();
const identifier = process.env.IDENTIFIER || 'default';
new AwsWorkshopStack(app, `AwsWorkshopStack-${identifier}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  identifier: identifier,
});
