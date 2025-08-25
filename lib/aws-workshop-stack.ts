import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class AwsWorkshopStack extends cdk.Stack {
  // パブリックプロパティとして定義し、他のリソースから参照可能にする
  public readonly vpc: ec2.Vpc;
  public readonly albSecurityGroup: ec2.SecurityGroup;
  public readonly ecsSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ===========================================
    // VPC作成
    // ===========================================
    // VPC（Virtual Private Cloud）を作成
    // - 2つのアベイラビリティゾーン（AZ）に分散配置
    // - パブリックサブネットとプライベートサブネット各2つずつ作成
    // - CDKが自動的に以下を作成：
    //   * Internet Gateway（インターネット接続用）
    //   * NAT Gateway×2（プライベートサブネットのアウトバウンド用）
    //   * Route Table×4（各サブネット用）
    //   * Elastic IP×2（NAT Gateway用）
    this.vpc = new ec2.Vpc(this, 'WorkshopVpc', {
      // 使用するアベイラビリティゾーンの最大数
      maxAzs: 2,
      // VPCのCIDRブロック（65,536個のIPアドレス）
      cidr: '10.0.0.0/16',
      // サブネット構成の定義
      subnetConfiguration: [
        {
          // サブネットのCIDRマスク（/24 = 256個のIPアドレス）
          cidrMask: 24,
          // サブネット名（CloudFormationリソース名で使用）
          name: 'PublicSubnet',
          // パブリックサブネット（Internet Gatewayへのルートあり）
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'PrivateSubnet',
          // プライベートサブネット（NAT Gatewayを通じて外部アクセス可能）
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }
      ],
      // DNSホスト名の解決を有効化（ECSで必要）
      enableDnsHostnames: true,
      // DNS解決を有効化（基本設定）
      enableDnsSupport: true,
    });

    // ===========================================
    // CloudFormationアウトプット（VPC情報）
    // ===========================================
    // デプロイ完了時にVPCの詳細情報を表示するため
    // 他のスタックやマネジメントコンソールでの確認に使用可能
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
    });

    new cdk.CfnOutput(this, 'PublicSubnets', {
      value: this.vpc.publicSubnets.map(subnet => subnet.subnetId).join(','),
      description: 'Public Subnet IDs',
    });

    new cdk.CfnOutput(this, 'PrivateSubnets', {
      value: this.vpc.privateSubnets.map(subnet => subnet.subnetId).join(','),
      description: 'Private Subnet IDs',
    });

    // ===========================================
    // セキュリティグループ作成
    // ===========================================
    
    // ALB（Application Load Balancer）用セキュリティグループ
    // インターネットからのHTTP/HTTPSアクセスを許可
    this.albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Application Load Balancer',
      // アウトバウンドトラフィックは全て許可（デフォルト）
      allowAllOutbound: true,
    });

    // インバウンドルール：HTTP（ポート80）を全てのIPから許可
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(), // 0.0.0.0/0（全てのIPアドレス）
      ec2.Port.tcp(80),   // TCPポート80
      'Allow HTTP traffic'
    );

    // インバウンドルール：HTTPS（ポート443）を全てのIPから許可
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(), // 0.0.0.0/0（全てのIPアドレス）
      ec2.Port.tcp(443),  // TCPポート443
      'Allow HTTPS traffic'
    );

    // ECS（Elastic Container Service）用セキュリティグループ
    // ALBからのトラフィックのみ許可（セキュリティ強化）
    this.ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for ECS containers',
      // アウトバウンドトラフィックは全て許可（コンテナがインターネットアクセス可能）
      allowAllOutbound: true,
    });

    // インバウンドルール：ALBからのHTTPアクセスのみ許可
    // セキュリティグループ同士を参照することで、ALBからの通信のみ許可
    this.ecsSecurityGroup.addIngressRule(
      this.albSecurityGroup, // ソースとしてALBのセキュリティグループを指定
      ec2.Port.tcp(80),      // TCPポート80
      'Allow traffic from ALB'
    );

    // ===========================================
    // CloudFormationアウトプット（セキュリティグループ情報）
    // ===========================================
    new cdk.CfnOutput(this, 'AlbSecurityGroupId', {
      value: this.albSecurityGroup.securityGroupId,
      description: 'ALB Security Group ID',
    });

    new cdk.CfnOutput(this, 'EcsSecurityGroupId', {
      value: this.ecsSecurityGroup.securityGroupId,
      description: 'ECS Security Group ID',
    });
  }
}
