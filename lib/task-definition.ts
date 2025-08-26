import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export interface TaskDefinitionProps {
  ecrRepository: ecr.Repository;
}

export class WorkshopTaskDefinition extends Construct {
  public readonly taskDefinition: ecs.FargateTaskDefinition;

  constructor(scope: Construct, id: string, props: TaskDefinitionProps) {
    super(scope, id);

    // ===========================================
    // ECSタスク実行ロール作成
    // ===========================================
    // ECS Fargateタスクを実行するために必要なIAMロール
    // ECRからのイメージプル、CloudWatch Logsへの書き込み権限が含まれる
    const executionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // ECRリポジトリへのアクセス権限を追加
    props.ecrRepository.grantPull(executionRole);

    // ===========================================
    // ECSタスクロール作成
    // ===========================================
    // コンテナ内のアプリケーションが使用するIAMロール
    // 必要に応じてAWSサービスへのアクセス権限を付与
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // ===========================================
    // Fargateタスク定義作成
    // ===========================================
    // コンテナの実行仕様を定義
    // CPU、メモリ、ネットワーク設定などを含む
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      family: 'aws-workshop-app-family',
      // CPU: 1024 = 1 vCPU
      cpu: 1024,
      // Memory: 3072 MiB = 3 GB
      memoryLimitMiB: 3072,
      // タスク実行ロール（ECS Fargateがタスクを起動するために使用）
      executionRole: executionRole,
      // タスクロール（コンテナ内のアプリケーションが使用）
      taskRole: taskRole,
      // ランタイムプラットフォーム設定
      runtimePlatform: {
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
      },
    });

    // ===========================================
    // コンテナ定義追加
    // ===========================================
    // タスク定義にメインアプリケーションコンテナを追加
    // 初期デプロイ用に軽量なbusyboxイメージを使用してヘルスチェックをクリア
    this.taskDefinition.addContainer('WorkshopAppContainer', {
      // 初期デプロイ用の軽量イメージ（後でECRイメージに更新）
      image: ecs.ContainerImage.fromRegistry('busybox:latest'),

      // ポートマッピング設定
      portMappings: [{
        containerPort: 3000,
        protocol: ecs.Protocol.TCP,
      }],

      // 環境変数設定
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
      },

      // CloudWatch Logsの設定
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'ecs-workshop-app',
        // ログの保持期間（日数）
        logRetention: 30,
      }),

      // コンテナを常に実行状態に保つコマンド
      command: ['sh', '-c', 'while true; do sleep 30; done'],

      // ヘルスチェック設定（常に成功するように設定）
      healthCheck: {
        // ヘルスチェックコマンド（常に成功）
        command: [
          'CMD-SHELL',
          'exit 0',
        ],
        // 間隔（秒）
        interval: cdk.Duration.seconds(30),
        // タイムアウト（秒）
        timeout: cdk.Duration.seconds(5),
        // 開始期間（秒）
        startPeriod: cdk.Duration.seconds(10),
        // 正常判定に必要な連続成功回数
        retries: 2,
      },

      // メモリの制限設定
      // ソフト制限（MB）- コンテナが通常使用可能なメモリ量
      memoryReservationMiB: 64,
      // ハード制限（MB）- コンテナが使用可能な最大メモリ量
      memoryLimitMiB: 128,

      // 必須コンテナとして設定（このコンテナが停止するとタスク全体が停止）
      essential: true,
    });

    // ===========================================
    // CloudFormationアウトプット（タスク定義情報）
    // ===========================================
    new cdk.CfnOutput(this, 'TaskDefinitionArn', {
      value: this.taskDefinition.taskDefinitionArn,
      description: 'ECS Task Definition ARN',
    });

    new cdk.CfnOutput(this, 'TaskDefinitionFamily', {
      value: this.taskDefinition.family,
      description: 'ECS Task Definition Family',
    });
  }
}
