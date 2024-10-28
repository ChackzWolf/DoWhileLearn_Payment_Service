# # Use Node.js 18 as the base image
# FROM node:18

# # Set working directory
# WORKDIR /usr/src/app

# # Copy package files first to leverage Docker cache
# COPY package*.json ./

# # Install dependencies without running the prepublish script
# RUN npm install --ignore-scripts

# # Install global dependencies
# RUN npm install -g ts-node nodemon

# # Copy TypeScript config
# COPY tsconfig.json .

# # Copy source code
# COPY src ./src

# # Build the TypeScript code
# RUN npm run build

# # Copy remaining files
# COPY . .

# # Expose the port your app runs on
# EXPOSE 5007

# # Start the application
# CMD ["npm", "run", "start"]

FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3007

CMD ["npm", "start"]