# AWS Workshop セットアップガイド

このワークショップでは、AWS CDKを使用してALB（Application Load Balancer）とECSでコンテナアプリケーションを構築します。

## 前提条件

- **Mac環境**
- **Node.js 18以上** がインストールされていること
- **AWS CLI** がインストール・設定されていること
- **AWS CDK** がグローバルインストールされていること
- **Docker Desktop** がインストールされていること（コンテナイメージ作成用）

## 1. 環境準備

### 1-1. Node.js のインストール確認
```bash
node --version
# v18.0.0以上であることを確認
```

### 1-2. AWS CLI のインストール・設定

#### インストール
```bash
# Homebrewを使用してインストール
brew install awscli

# インストール確認
aws --version
```

#### 設定
```bash
aws configure
# AWS Access Key ID: [あなたのアクセスキー]
# AWS Secret Access Key: [あなたのシークレットキー]  
# Default region name: ap-northeast-1
# Default output format: json
```

### 1-3. AWS CDK のインストール
```bash
# CDKをグローバルインストール
npm install -g aws-cdk

# インストール確認
cdk --version
```

### 1-4. CDK Bootstrap (初回のみ)
```bash
# AWS環境でCDKを初期化（初回のみ実行）
cdk bootstrap
```

## 2. プロジェクトのセットアップ

### 2-1. リポジトリのクローン
```bash
git clone [このリポジトリのURL]
cd AWS-Workshop
```

### 2-2. 依存関係のインストール
```bash
npm install
```

### 2-3. プロジェクトのビルド
```bash
npm run build
```

## 3. デプロイ前の確認

### 3-1. CloudFormationテンプレートの確認
```bash
# 生成されるAWSリソースを確認
npx cdk synth
```

### 3-2. 差分の確認
```bash
# 現在のAWS環境との差分を確認
npx cdk diff
```

## 4. デプロイ実行

### 4-1. スタックのデプロイ
```bash
# AWSにリソースをデプロイ
npx cdk deploy
```

デプロイには5-10分程度かかります。

### 4-2. デプロイ完了後の確認
デプロイが完了すると、以下の情報が出力されます：
- VPC ID
- パブリックサブネット ID
- プライベートサブネット ID
- セキュリティグループ ID

## 5. リソースの削除

ワークショップ終了後は、課金を避けるため必ずリソースを削除してください。

```bash
# すべてのリソースを削除
npx cdk destroy
```

## トラブルシューティング

### よくあるエラー

#### 1. AWS認証エラー
```
Unable to locate credentials
```
**解決方法**: `aws configure` コマンドでAWS認証情報を再設定してください。

#### 2. CDK Bootstrap未実行エラー  
```
This stack uses assets, so the toolkit stack must be deployed
```
**解決方法**: `cdk bootstrap` を実行してください。

#### 3. リージョン指定エラー
**解決方法**: `aws configure` でデフォルトリージョンが `ap-northeast-1` に設定されていることを確認してください。

## サポート

問題が発生した場合は、講師まで質問してください。

## 現在の実装状況

- ✅ VPC（Virtual Private Cloud）
- ✅ パブリック・プライベートサブネット
- ✅ インターネットゲートウェイ・NATゲートウェイ
- ✅ セキュリティグループ（ALB用・ECS用）
- 🚧 Application Load Balancer（実装予定）
- 🚧 ECSクラスター（実装予定）
- 🚧 ECSタスク定義・サービス（実装予定）