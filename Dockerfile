FROM nginx:alpine

# Copy custom Nginx reverse proxy configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static website files
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY auth.js /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
