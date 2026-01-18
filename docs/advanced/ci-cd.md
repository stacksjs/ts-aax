# CI/CD Integration

AAX integrates with CI/CD platforms for automated audiobook conversion workflows. This guide covers integration patterns for popular platforms.

## GitHub Actions

### Basic Workflow

```yaml
name: Convert Audiobooks
on:
  push:
    paths:
      - 'audiobooks/**/*.aax'
  workflow_dispatch:

jobs:
  convert:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install FFmpeg
        run: sudo apt-get update && sudo apt-get install -y ffmpeg

      - name: Install AAX
        run: bun install -g aax

      - name: Convert audiobooks
        env:
          AUDIBLE_ACTIVATION_BYTES: ${{ secrets.AUDIBLE_ACTIVATION_BYTES }}
        run: aax convert ./audiobooks/ --output ./converted/

      - name: Upload converted files
        uses: actions/upload-artifact@v4
        with:
          name: converted-audiobooks
          path: converted/
```

### With Caching

```yaml
jobs:
  convert:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Cache AAX
        uses: actions/cache@v4
        with:
          path: ~/.aax/cache
          key: aax-cache-${{ runner.os }}-${{ hashFiles('audiobooks/**') }}
          restore-keys: |
            aax-cache-${{ runner.os }}-

      - name: Install dependencies
        run: |
          sudo apt-get update && sudo apt-get install -y ffmpeg
          bun install -g aax

      - name: Convert
        env:
          AUDIBLE_ACTIVATION_BYTES: ${{ secrets.AUDIBLE_ACTIVATION_BYTES }}
        run: aax convert ./audiobooks/ --skip-existing --output ./converted/
```

### Scheduled Conversion

```yaml
name: Nightly Conversion
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily

jobs:
  convert:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup
        run: |
          sudo apt-get update && sudo apt-get install -y ffmpeg
          bun install -g aax

      - name: Convert new files
        env:
          AUDIBLE_ACTIVATION_BYTES: ${{ secrets.AUDIBLE_ACTIVATION_BYTES }}
        run: |
          aax convert ./audiobooks/ \
            --skip-existing \
            --format m4b \
            --output ./converted/ \
            --log ./conversion.log

      - name: Commit converted files
        run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add converted/
          git commit -m "chore: convert audiobooks" || exit 0
          git push
```

## GitLab CI

### Basic Pipeline

```yaml
stages:
  - convert
  - deploy

convert-audiobooks:
  stage: convert
  image: oven/bun:latest
  before_script:
    - apt-get update && apt-get install -y ffmpeg
    - bun install -g aax
  script:
    - aax convert ./audiobooks/ --output ./converted/
  variables:
    AUDIBLE_ACTIVATION_BYTES: $AUDIBLE_ACTIVATION_BYTES
  artifacts:
    paths:
      - converted/
    expire_in: 1 week
  cache:
    key: aax-cache
    paths:
      - .aax/cache/
```

### Multi-Format Pipeline

```yaml
.convert-template:
  image: oven/bun:latest
  before_script:
    - apt-get update && apt-get install -y ffmpeg
    - bun install -g aax

convert-mp3:
  extends: .convert-template
  script:
    - aax convert ./audiobooks/ --format mp3 --output ./mp3/
  artifacts:
    paths:
      - mp3/

convert-m4b:
  extends: .convert-template
  script:
    - aax convert ./audiobooks/ --format m4b --output ./m4b/
  artifacts:
    paths:
      - m4b/
```

## Docker

### Dockerfile

```dockerfile
FROM oven/bun:latest

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Install AAX
RUN bun install -g aax

# Set working directory
WORKDIR /app

# Default command
CMD ["aax", "--help"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  aax-converter:
    build: .
    volumes:
      - ./audiobooks:/app/input
      - ./converted:/app/output
      - aax-cache:/root/.aax/cache
    environment:
      - AUDIBLE_ACTIVATION_BYTES=${AUDIBLE_ACTIVATION_BYTES}
    command: aax convert /app/input/ --output /app/output/

volumes:
  aax-cache:
```

### Usage

```bash
# Build
docker build -t aax-converter .

# Run conversion
docker run -v $(pwd)/audiobooks:/input -v $(pwd)/converted:/output \
  -e AUDIBLE_ACTIVATION_BYTES=$AUDIBLE_ACTIVATION_BYTES \
  aax-converter aax convert /input/ --output /output/
```

## Jenkins

### Jenkinsfile

```groovy
pipeline {
    agent {
        docker {
            image 'oven/bun:latest'
            args '-v aax-cache:/root/.aax/cache'
        }
    }

    environment {
        AUDIBLE_ACTIVATION_BYTES = credentials('audible-activation-bytes')
    }

    stages {
        stage('Setup') {
            steps {
                sh 'apt-get update && apt-get install -y ffmpeg'
                sh 'bun install -g aax'
            }
        }

        stage('Convert') {
            steps {
                sh 'aax convert ./audiobooks/ --output ./converted/'
            }
        }

        stage('Archive') {
            steps {
                archiveArtifacts artifacts: 'converted/**/*'
            }
        }
    }
}
```

## CircleCI

```yaml
version: 2.1

jobs:
  convert:
    docker:
      - image: oven/bun:latest
    steps:
      - checkout
      - restore_cache:
          keys:
            - aax-cache-v1-{{ .Branch }}
            - aax-cache-v1-
      - run:
          name: Install dependencies
          command: |
            apt-get update && apt-get install -y ffmpeg
            bun install -g aax
      - run:
          name: Convert audiobooks
          command: aax convert ./audiobooks/ --output ./converted/
          environment:
            AUDIBLE_ACTIVATION_BYTES: ${AUDIBLE_ACTIVATION_BYTES}
      - save_cache:
          key: aax-cache-v1-{{ .Branch }}
          paths:
            - ~/.aax/cache
      - store_artifacts:
          path: converted/

workflows:
  convert-workflow:
    jobs:
      - convert
```

## Secrets Management

### GitHub Actions Secrets

1. Go to repository Settings > Secrets and variables > Actions
2. Add `AUDIBLE_ACTIVATION_BYTES` secret
3. Reference in workflow: `${{ secrets.AUDIBLE_ACTIVATION_BYTES }}`

### GitLab CI Variables

1. Go to Settings > CI/CD > Variables
2. Add `AUDIBLE_ACTIVATION_BYTES` (masked)
3. Reference in pipeline: `$AUDIBLE_ACTIVATION_BYTES`

### HashiCorp Vault

```yaml
- name: Get secrets from Vault
  uses: hashicorp/vault-action@v2
  with:
    url: ${{ secrets.VAULT_URL }}
    token: ${{ secrets.VAULT_TOKEN }}
    secrets: |
      secret/data/aax activation_bytes | AUDIBLE_ACTIVATION_BYTES
```

## Monitoring and Alerts

### Slack Notifications

```yaml
- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "Audiobook conversion ${{ job.status }}",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Conversion:* ${{ job.status }}\n*Files:* ${{ steps.convert.outputs.count }}"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### Email Reports

```bash
#!/bin/bash
aax convert ./audiobooks/ --log ./log.txt

if [ $? -eq 0 ]; then
  mail -s "Conversion Complete" user@example.com < ./log.txt
else
  mail -s "Conversion Failed" user@example.com < ./log.txt
fi
```

## Best Practices

1. **Use secrets**: Never expose activation bytes in logs
2. **Cache aggressively**: Cache AAX cache directory
3. **Skip existing**: Avoid redundant conversions
4. **Log everything**: Keep detailed conversion logs
5. **Handle failures**: Continue on error, report failures
6. **Artifact retention**: Set appropriate expiration times

## Related

- [Configuration](/advanced/configuration) - Full config options
- [Batch Processing](/features/batch-processing) - Multi-file processing
- [Performance](/advanced/performance) - Optimization techniques
