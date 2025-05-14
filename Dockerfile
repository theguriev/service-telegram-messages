# Specify the base image
FROM node:21-alpine3.18

# Install PNPM
RUN npm install -g pnpm

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json pnpm-lock.yaml ./

# Bundle app source
COPY . .

# Install app dependencies
RUN pnpm install

# build app
RUN pnpm run build

# Expose a port that the application will listen on
EXPOSE 3000

# Define the command to run the app
CMD [ "node", ".output/server/index.mjs" ]
