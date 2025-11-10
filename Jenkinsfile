pipeline {
  agent any

  environment {
    PROJECT_DIR = "/root/projects/school-management-system"
    REPO_URL = "https://github.com/naseerai/school-management-system.git"
    APP_NAME = "school-management-system"
    IMAGE_TAG = "${APP_NAME}:${env.BUILD_NUMBER}"
    CONTAINER_NAME = "${APP_NAME}"
    DEPLOY_SERVER = "96.8.121.100"
    SSH_CRED_ID = "temp"
  }

  triggers {
    githubPush()
  }

  stages {
    stage('Clone or Pull Repo') {
      steps {
        script {
          if (fileExists("${PROJECT_DIR}/.git")) {
            echo "Repository exists — pulling latest..."
            dir("${PROJECT_DIR}") {
              sh '''
                git fetch origin main
                git reset --hard origin/main
                git clean -fd
              '''
            }
          } else {
            echo "Cloning repository..."
            sh '''
              mkdir -p /root/projects
              cd /root/projects
              git clone ${REPO_URL}
            '''
          }
        }
      }
    }

    stage('Remove Old Container') {
      steps {
        sh '''
        if [ "$(docker ps -q -f name=${CONTAINER_NAME})" ]; then
          docker stop ${CONTAINER_NAME} && docker rm ${CONTAINER_NAME}
        fi
        '''
      }
    }

    stage('Remove Old Image') {
      steps {
        sh '''
        old_image=$(docker images -q ${APP_NAME})
        if [ -n "$old_image" ]; then
          docker rmi -f $old_image || true
        fi
        '''
      }
    }

    stage('Build New Docker Image') {
      steps {
        dir("${PROJECT_DIR}") {
          sh 'docker build -t ${IMAGE_TAG} .'
        }
      }
    }

    stage('Deploy to Remote Server') {
      steps {
        sshagent (credentials: [env.SSH_CRED_ID]) {
          sh '''
          docker save ${IMAGE_TAG} | bzip2 | ssh -o StrictHostKeyChecking=no ubuntu@${DEPLOY_SERVER} 'bunzip2 | docker load'
          ssh -o StrictHostKeyChecking=no ubuntu@${DEPLOY_SERVER} "
            if [ \$(docker ps -q -f name=${CONTAINER_NAME}) ]; then
              docker stop ${CONTAINER_NAME} && docker rm ${CONTAINER_NAME}
            fi
            docker run -d --name ${CONTAINER_NAME} -p 80:80 ${IMAGE_TAG}
          "
          '''
        }
      }
    }
  }

  post {
    success { echo "✅ Deployment finished successfully!" }
    failure { echo "❌ Deployment failed." }
  }
}

