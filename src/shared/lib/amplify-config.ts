import { type ResourcesConfig } from 'aws-amplify'

export const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'sa-east-1_0ySBjVR2a',
      userPoolClientId: '5d9qjj0r19ecsu870q1qdrm6k1',
    },
  },
  API: {
    GraphQL: {
      endpoint: 'https://us3osinu4nds5cxawiw2yopvny.appsync-api.sa-east-1.amazonaws.com/graphql',
      region: 'sa-east-1',
      defaultAuthMode: 'userPool',
    },
  },
}
