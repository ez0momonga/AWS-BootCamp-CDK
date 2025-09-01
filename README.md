# AWS ALB + ECS ワークショップ

AWS CDK（TypeScript）を使用してApplication Load Balancer（ALB）とECS（Elastic Container Service）でコンテナアプリケーションを構築するワークショップです。

## 📋 学習目標

- AWS CDKの基本的な使い方を習得
- VPCとネットワーク設定の理解
- Application Load Balancerの設定
- ECSクラスターとサービスの構築
- Infrastructure as Code（IaC）の実践

## 🚀 初心者向けセットアップ・デプロイガイド

### 📝 事前準備

以下がインストールされていることを確認してください：
- **Node.js 18以上**
- **AWS CLI**
- **Docker Desktop**

> 💡 **CDKについて**: このプロジェクトではCDKをローカル依存関係として管理しているため、グローバルインストールは不要です。

### 1. AWS 認証設定

```bash
# AWS SSO でログイン
aws sso login

# プロファイルを指定してログインする場合
aws sso login --profile develop

# 設定確認
aws sts get-caller-identity
```

> **注意**: プロファイル名（`develop`など）は事前にAWS CLI設定ファイル（`~/.aws/config`）で設定されている必要があります。講師から指定されたプロファイル名を使用してください。

### 2. 環境変数の設定

このプロジェクトでは環境変数を`.env`ファイルで管理しています。

```bash
# サンプルファイルをコピーして.envファイルを作成
cp .env.example .env

# .envファイルを編集してAWSアカウントIDなどを設定してください

# .envファイルの内容確認
cat .env
```

AWS プロファイルを使用する場合は環境変数で指定：
```bash
# AWS プロファイルを指定（SSOを使用する場合）
export AWS_PROFILE=develop
```

### 3. CDK 初期設定

```bash
# CDK Bootstrap（AWS アカウント初回のみ）
npx cdk bootstrap
```

### 4. プロジェクトセットアップ

```bash
# リポジトリをクローン
git clone [このリポジトリのURL]
cd [AWS-Workshopのディレクトリ]

# 依存関係をインストール
npm install
```

### 5. デプロイ前の確認

```bash
# 生成されるAWSリソースを確認
npx cdk synth

# AWS環境との差分を確認
npx cdk diff
```

### 6. デプロイ実行

```bash
# AWSにリソースをデプロイ（5-10分程度）
npx cdk deploy

# 確認プロンプトで 'y' を入力
```

### 6. 削除（重要！）

⚠️ **課金回避のため、使用後は必ず削除してください**

```bash
# 全てのAWSリソースを削除（3-5分程度）
npx cdk destroy

# 確認プロンプトで 'y' を入力
```

### 7. デプロイ完了後の確認

デプロイ完了後、AWS マネジメントコンソールで以下のリソースが作成されることを確認：

- **VPC**: カスタムVPC（10.0.0.0/16）
- **サブネット**: パブリック×2、プライベート×2（マルチAZ構成）
- **セキュリティグループ**: ALB用、ECS用
- **その他**: インターネットゲートウェイ、NATゲートウェイ

### 8. よくあるエラーと解決方法

#### AWS 認証エラー
```
Unable to locate credentials
```
**解決方法**: `aws configure` で AWS 認証情報を再設定

#### CDK Bootstrap 未実行エラー
```
This stack uses assets, so the toolkit stack must be deployed
```
**解決方法**: `cdk bootstrap` を実行

#### リージョン設定エラー
**解決方法**: デフォルトリージョンが `ap-northeast-1` に設定されていることを確認

## 📁 プロジェクト構成

```
AWS-Workshop/
├── bin/
│   └── aws-workshop.ts          # CDKアプリのエントリーポイント
├── lib/
│   └── aws-workshop-stack.ts    # メインのスタック定義
├── test/
│   └── aws-workshop.test.ts     # テストファイル
├── SETUP.md                     # 詳細セットアップガイド
└── README.md                    # このファイル
```

## 🏗️ アーキテクチャ

```
Internet Gateway
       ↓
   Public Subnets (Multi-AZ)
       ↓
Application Load Balancer
       ↓
   Private Subnets (Multi-AZ)
       ↓
    ECS Cluster
  (Fargate Tasks)
```

## 📚 ワークショップの流れ

1. **ネットワーク基盤構築** - VPC、サブネット、セキュリティグループ
2. **ロードバランサー設定** - ALBの作成と設定
3. **コンテナ環境構築** - ECSクラスターとタスク定義
4. **アプリケーションデプロイ** - コンテナサービスの起動
5. **動作確認** - エンドポイントアクセステスト

## 🛠️ 便利なコマンド一覧

### 開発・テスト
* `npm run build`   - TypeScriptをJavaScriptにコンパイル
* `npm run watch`   - ファイル変更を監視して自動コンパイル
* `npm run test`    - Jestユニットテストを実行
* `npm run lint`    - ESLintでコード品質チェック
* `npm run typecheck` - TypeScriptの型チェック

### CDK 操作
* `npx cdk synth`   - CloudFormationテンプレートを生成・確認
* `npx cdk diff`    - デプロイ済みスタックと現在の状態を比較
* `npx cdk deploy`  - スタックをAWSにデプロイ（⚠️学生自身が実行）
* `npx cdk destroy` - すべてのリソースを削除（⚠️必須）

### AWS CLI
* `aws sts get-caller-identity` - AWS認証情報の確認
* `aws configure` - AWS認証情報の設定

## ⚠️ 重要な注意事項

- **デプロイ作業**: `npx cdk deploy` は**必ず学生自身が実行**してください（講師は代行しません）
- **リソース削除**: ワークショップ終了後は `npx cdk destroy` で**必ずリソースを削除**してください
- **料金**: NATゲートウェイやALBは**時間課金**されるため、不要時は必ず削除をお願いします
- **リージョン**: このプロジェクトは `ap-northeast-1`（東京）リージョンを前提としています
- **責任**: デプロイ・削除は学生の責任で実行し、**課金も学生が負担**します

## 🆘 サポート

問題が発生した場合:
1. [SETUP.md](./SETUP.md) のトラブルシューティングセクションを確認
2. 講師に質問
3. AWS CloudFormationコンソールでスタックの状態を確認
