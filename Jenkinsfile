pipeline {
  agent any

  environment {
    REPO_URL = "https://github.com/naseerai/school-management-system.git"
    APP_NAME = "school-management-system"
    IMAGE_TAG = "${APP_NAME}:${env.BUILD_NUMBER}"
    CONTAINER_NAME = "${APP_NAME}"

    DEPLOY_SERVER = "96.8.121.100"      // remote server
    SSH_CRED_ID   = "temp"              // Jenkins credential ID
    REMOTE_PROJECT_DIR = "/root/projects/school-management-system"
  }

  triggers { githubPush() }

  stages {

    stage('Checkout Source Code') {
      steps {
        echo "📦 Checking out latest code..."
        checkout([$class: 'GitSCM',
          branches: [[name: '*/main']],
          userRemoteConfigs: [[url: "${REPO_URL}"]]
        ])
      }
    }

    stage('Prepare .env file') {
      steps {
        sh '''
        if [ -f .env.example ]; then
          echo "📄 Copying .env.example → .env"
          cp .env.example .env
        else
          echo "⚠️ No .env.example file found; skipping."
        fi
        '''
      }
    }

    stage('Build Docker Image (on Jenkins)') {
      steps {
        echo "⚙️ Building Docker image locally..."
        sh 'docker build -t ${IMAGE_TAG} .'
      }
    }

    stage('Deploy to Remote Server') {
      steps {
        sshagent (credentials: [env.SSH_CRED_ID]) {
          sh '''
          echo "🚀 Sending image to ${DEPLOY_SERVER}..."
          docker save ${IMAGE_TAG} | bzip2 | \
            ssh -o StrictHostKeyChecking=no ubuntu@${DEPLOY_SERVER} 'bunzip2 | docker load'

          echo "🧹 Cleaning old container..."
          ssh -o StrictHostKeyChecking=no ubuntu@${DEPLOY_SERVER} "
            if [ \$(docker ps -q -f name=${CONTAINER_NAME}) ]; then
              docker stop ${CONTAINER_NAME} && docker rm ${CONTAINER_NAME}
            fi
          "

          echo "📂 Ensuring project directory exists..."
          ssh -o StrictHostKeyChecking=no ubuntu@${DEPLOY_SERVER} "
            sudo mkdir -p ${REMOTE_PROJECT_DIR} && sudo chown ubuntu:ubuntu ${REMOTE_PROJECT_DIR}
          "

          echo "🔥 Starting new container..."
          ssh -o StrictHostKeyChecking=no ubuntu@${DEPLOY_SERVER} "
            docker run -d --name ${CONTAINER_NAME} -p 80:80 ${IMAGE_TAG}
          "
          '''
        }
      }
    }
  }

  post {
    success { echo "✅ Deployment completed successfully!" }
    failure { echo "❌ Deployment failed; check console output." }
  }
}

