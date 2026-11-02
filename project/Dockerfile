# Step 1: Base image - lightweight Nginx web server on Alpine Linux
FROM nginx:alpine

# Step 2: Copy web application source files into Nginx public directory
COPY source-code/ /usr/share/nginx/html

# Step 3: Expose port 80 for web traffic
EXPOSE 80

# Step 4: Run Nginx in foreground to keep container active
CMD ["nginx", "-g", "daemon off;"]
