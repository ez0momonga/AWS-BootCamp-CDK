#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AwsWorkshopStack } from '../lib/aws-workshop-stack';

const app = new cdk.App();
new AwsWorkshopStack(app, 'AwsWorkshopStack');
