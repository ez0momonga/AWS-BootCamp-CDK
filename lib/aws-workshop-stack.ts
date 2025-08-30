import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

interface AwsWorkshopStackProps extends cdk.StackProps {
  identifier?: string;
}

export class AwsWorkshopStack extends cdk.Stack {
  // パブリックプロパティとして定義し、他のリソースから参照可能にする
  public readonly vpc: ec2.Vpc;
  public readonly albSecurityGroup: ec2.SecurityGroup;
  public readonly ecsSecurityGroup: ec2.SecurityGroup;
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly targetGroup: elbv2.ApplicationTargetGroup;
  public readonly ecrRepository: ecr.Repository;
  public readonly ecsCluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props?: AwsWorkshopStackProps) {
    super(scope, id, props);

    // デフォルト値として'default'を使用、環境変数または引数で上書き可能
    const identifier = props?.identifier || 'default';

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
        },
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
      'Allow HTTP traffic',
    );

    // インバウンドルール：HTTPS（ポート443）を全てのIPから許可
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(), // 0.0.0.0/0（全てのIPアドレス）
      ec2.Port.tcp(443),  // TCPポート443
      'Allow HTTPS traffic',
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
      'Allow traffic from ALB',
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

    // ===========================================
    // Application Load Balancer (ALB) 作成
    // ===========================================
    // インターネット向けのApplication Load Balancerを作成
    // - パブリックサブネットに配置してインターネットからアクセス可能
    // - 複数のアベイラビリティゾーンにまたがって高可用性を確保
    // - 作成したALB用セキュリティグループを適用
    this.alb = new elbv2.ApplicationLoadBalancer(this, 'WorkshopAlb', {
      vpc: this.vpc,
      // インターネット向けALB（パブリックサブネットに配置）
      internetFacing: true,
      // パブリックサブネットを指定（複数AZで高可用性）
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      // 作成済みのALB用セキュリティグループを適用
      securityGroup: this.albSecurityGroup,
      // 削除保護を無効化（ワークショップ用途のため）
      deletionProtection: false,
    });

    // ===========================================
    // ターゲットグループ作成
    // ===========================================
    // ALBがリクエストを転送する先のターゲットグループを作成
    // ECSサービスがこのターゲットグループにタスクを登録する
    this.targetGroup = new elbv2.ApplicationTargetGroup(this, 'WorkshopTargetGroup', {
      // ターゲットタイプをIPアドレスに設定（ECS Fargateで使用）
      targetType: elbv2.TargetType.IP,
      // 使用するポート番号（コンテナのリスニングポート）
      port: 80,
      // プロトコル設定
      protocol: elbv2.ApplicationProtocol.HTTP,
      // VPCを指定
      vpc: this.vpc,

      // ヘルスチェック設定
      healthCheck: {
        // ヘルスチェック用のパス（コンテナのヘルスチェックエンドポイント）
        path: '/',
        // ヘルスチェックのプロトコル
        protocol: elbv2.Protocol.HTTP,
        // ヘルスチェックの間隔（秒）
        interval: cdk.Duration.seconds(30),
        // タイムアウト時間（秒）
        timeout: cdk.Duration.seconds(5),
        // 正常判定に必要な連続成功回数
        healthyThresholdCount: 2,
        // 異常判定に必要な連続失敗回数
        unhealthyThresholdCount: 3,
        // 正常応答として期待するHTTPステータスコード
        healthyHttpCodes: '200',
      },
    });

    // ===========================================
    // ALBリスナー作成
    // ===========================================
    // ALBがリクエストを受信した際の処理を定義
    // HTTP（ポート80）でリクエストを受信し、ターゲットグループに転送
    this.alb.addListener('WorkshopListener', {
      // リスニングポート
      port: 80,
      // プロトコル
      protocol: elbv2.ApplicationProtocol.HTTP,

      // デフォルトアクション：全てのリクエストをターゲットグループに転送
      defaultAction: elbv2.ListenerAction.forward([this.targetGroup]),
    });

    // ===========================================
    // CloudFormationアウトプット（ALB情報）
    // ===========================================
    new cdk.CfnOutput(this, 'AlbArn', {
      value: this.alb.loadBalancerArn,
      description: 'ALB ARN',
    });

    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: this.alb.loadBalancerDnsName,
      description: 'ALB DNS Name (Access URL)',
    });

    new cdk.CfnOutput(this, 'TargetGroupArn', {
      value: this.targetGroup.targetGroupArn,
      description: 'Target Group ARN',
    });

    new cdk.CfnOutput(this, 'AlbUrl', {
      value: `http://${this.alb.loadBalancerDnsName}`,
      description: 'Application URL (HTTP)',
    });

    // ===========================================
    // ECR（Elastic Container Registry）リポジトリ作成
    // ===========================================
    // コンテナイメージを保存するためのプライベートリポジトリを作成
    // ECSタスクはここからコンテナイメージをプルして実行する
    this.ecrRepository = new ecr.Repository(this, 'WorkshopRepository', {
      // リポジトリ名（小文字・ハイフンのみ使用可能）
      repositoryName: `aws-workshop-app-${identifier}`,
      // イメージタグの可変性設定（Mutable: タグの上書き可能）
      imageTagMutability: ecr.TagMutability.MUTABLE,
      // 暗号化設定（AWS KMSを使用、AWS管理キー）
      encryption: ecr.RepositoryEncryption.KMS,
      // スタック削除時の動作設定（ワークショップ用のため削除可能にする）
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      // スタック削除時にイメージがあっても強制削除する
      emptyOnDelete: true,
    });

    // ===========================================
    // CloudFormationアウトプット（ECR情報）
    // ===========================================
    new cdk.CfnOutput(this, 'EcrRepositoryArn', {
      value: this.ecrRepository.repositoryArn,
      description: 'ECR Repository ARN',
    });

    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: this.ecrRepository.repositoryUri,
      description: 'ECR Repository URI (for docker push)',
    });

    new cdk.CfnOutput(this, 'EcrRepositoryName', {
      value: this.ecrRepository.repositoryName,
      description: 'ECR Repository Name',
    });

    // ===========================================
    // ECS（Elastic Container Service）クラスター作成
    // ===========================================
    // コンテナタスクを実行するための論理的なグループを作成
    // - Fargate起動タイプを使用するため、EC2インスタンスの管理は不要
    // - 作成済みのVPC内にクラスターを配置
    this.ecsCluster = new ecs.Cluster(this, 'WorkshopCluster', {
      vpc: this.vpc,
      // クラスター名
      clusterName: `aws-workshop-cluster-${identifier}`,
      // Fargateキャパシティプロバイダーを有効化
      enableFargateCapacityProviders: true,
      // Container Insightsを有効化（モニタリング用）
      containerInsights: true,
    });

    // ===========================================
    // CloudFormationアウトプット（ECSクラスター情報）
    // ===========================================
    new cdk.CfnOutput(this, 'EcsClusterName', {
      value: this.ecsCluster.clusterName,
      description: 'ECS Cluster Name',
    });

    new cdk.CfnOutput(this, 'EcsClusterArn', {
      value: this.ecsCluster.clusterArn,
      description: 'ECS Cluster ARN',
    });

    // ===========================================
    // ECSプレースホルダー・タスク定義
    // ===========================================
    // サービスを初回作成するために必要な、プレースホルダーのタスク定義
    // 実際のデプロイはCI/CDパイプラインが新しいリビジョンを作成して行う
    const placeholderTaskDefinition = new ecs.FargateTaskDefinition(this, 'PlaceholderTaskDef', {
      family: `aws-workshop-app-family-${identifier}`,
      cpu: 512, // 0.5 vCPU
      memoryLimitMiB: 1024, // 1 GB
      runtimePlatform: {
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
      },
    });

    // プレースホルダーのコンテナを追加
    placeholderTaskDefinition.addContainer('PlaceholderContainer', {
      // 軽量で確実に存在するnginxイメージを使用
      image: ecs.ContainerImage.fromRegistry('nginx:latest'),
      portMappings: [{
        containerPort: 80, // nginxは80番ポートでリッスンする
        protocol: ecs.Protocol.TCP,
      }],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'ecs-placeholder',
        logRetention: 30, // ログの保持期間（30日）
      }),
    });

    // ECRリポジトリへの読み取り権限をExecutionRoleに付与（コンテナ追加後に実行）
    this.ecrRepository.grantPull(placeholderTaskDefinition.executionRole!);

    // ===========================================
    // ECSサービス作成
    // ===========================================
    // コンテナを永続的に実行・管理するためのFargateサービスを作成
    const ecsService = new ecs.FargateService(this, 'WorkshopFargateService', {
      cluster: this.ecsCluster,
      // プレースホルダーのタスク定義を指定
      taskDefinition: placeholderTaskDefinition,
      // 実行するタスクの希望数
      desiredCount: 2,
      // ALBのターゲットグループにサービスを関連付ける
      assignPublicIp: false, // プライベートサブネットに配置するためパブリックIPは不要
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [this.ecsSecurityGroup],
      // サービスのヘルスチェック猶予期間
      healthCheckGracePeriod: cdk.Duration.seconds(60),
    });

    // サービスをALBのターゲットグループにアタッチ
    ecsService.attachToApplicationTargetGroup(this.targetGroup);

    // ===========================================
    // CloudFormationアウトプット（ECSサービス情報）
    // ===========================================
    new cdk.CfnOutput(this, 'EcsServiceName', {
      value: ecsService.serviceName,
      description: 'ECS Service Name',
    });
  }
}
