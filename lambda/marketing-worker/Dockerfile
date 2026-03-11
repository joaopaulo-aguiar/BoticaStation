FROM public.ecr.aws/lambda/nodejs:20

# Install dependencies
COPY package.json ${LAMBDA_TASK_ROOT}/
RUN npm install --production

# Copy function code
COPY index.mjs ${LAMBDA_TASK_ROOT}/

# Set the handler
CMD [ "index.handler" ]
