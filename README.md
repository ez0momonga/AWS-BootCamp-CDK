# AWS ALB + ECS ワークショップ

AWS CDK（TypeScript）を使用してApplication Load Balancer（ALB）とECS（Elastic Container Service）でコンテナアプリケーションを構築するワークショップです。

## 📋 学習目標

- AWS CDKの基本的な使い方を習得
- VPCとネットワーク設定の理解
- Application Load Balancerの設定
- ECSクラスターとサービスの構築
- Infrastructure as Code（IaC）の実践

## 🚀 クイックスタート

### 1. セットアップ
詳細な手順は [SETUP.md](./SETUP.md) を参照してください。

```bash
# リポジトリをクローン
git clone [このリポジトリのURL]
cd AWS-Workshop

# 依存関係をインストール
npm install

# ビルド
npm run build

# デプロイ
npx cdk deploy
```

### 2. リソース確認
デプロイ後、AWS マネジメントコンソールで以下のリソースが作成されることを確認：

- **VPC**: カスタムVPC（10.0.0.0/16）
- **サブネット**: パブリック×2、プライベート×2（マルチAZ構成）
- **セキュリティグループ**: ALB用、ECS用
- **その他**: インターネットゲートウェイ、NATゲートウェイ

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

## 🛠️ 便利なコマンド

* `npm run build`   - TypeScriptをJavaScriptにコンパイル
* `npm run watch`   - ファイル変更を監視してコンパイル
* `npm run test`    - Jestユニットテストを実行
* `npx cdk deploy`  - スタックをAWSアカウント/リージョンにデプロイ
* `npx cdk diff`    - デプロイ済みスタックと現在の状態を比較
* `npx cdk synth`   - CloudFormationテンプレートを生成
* `npx cdk destroy` - すべてのリソースを削除

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
