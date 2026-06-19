FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (we need devDependencies for the build)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Start the application
CMD ["npm", "run", "start"]
