import { generateClient } from 'aws-amplify/api'
import type {
  VerifiedIdentity, SesAccountStatus, SenderProfile,
  CognitoUser, CognitoGroup, CreateUserInput, UpdateUserInput,
} from '../types'

const client = generateClient()

// ── SES ──────────────────────────────────────────────────────────────────────

export async function getSesAccountStatus(): Promise<SesAccountStatus> {
  const query = /* GraphQL */ `
    query GetSesAccountStatus {
      getSesAccountStatus {
        sendingEnabled
        inSandbox
        max24HourSend
        sentLast24Hours
        maxSendRate
        configSets
      }
    }
  `
  const { data } = await client.graphql({ query }) as { data: { getSesAccountStatus: SesAccountStatus } }
  return data.getSesAccountStatus
}

export async function listVerifiedIdentities(): Promise<VerifiedIdentity[]> {
  const query = /* GraphQL */ `
    query ListVerifiedIdentities {
      listVerifiedIdentities {
        identity
        type
        sendingEnabled
        verificationStatus
      }
    }
  `
  const { data } = await client.graphql({ query }) as { data: { listVerifiedIdentities: VerifiedIdentity[] } }
  return data.listVerifiedIdentities ?? []
}

export async function requestEmailVerification(email: string): Promise<boolean> {
  const mutation = /* GraphQL */ `
    mutation RequestEmailVerification($email: String!) {
      requestEmailVerification(email: $email)
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { email } }) as { data: { requestEmailVerification: boolean } }
  return data.requestEmailVerification
}

export async function verifyDomain(domain: string): Promise<string[]> {
  const mutation = /* GraphQL */ `
    mutation VerifyDomain($domain: String!) {
      verifyDomain(domain: $domain)
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { domain } }) as { data: { verifyDomain: string[] } }
  return data.verifyDomain
}

export async function deleteVerifiedIdentity(identity: string): Promise<boolean> {
  const mutation = /* GraphQL */ `
    mutation DeleteVerifiedIdentity($identity: String!) {
      deleteVerifiedIdentity(identity: $identity)
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { identity } }) as { data: { deleteVerifiedIdentity: boolean } }
  return data.deleteVerifiedIdentity
}

// ── Sender Profiles (DynamoDB) ───────────────────────────────────────────────

export async function listSenderProfiles(): Promise<SenderProfile[]> {
  const query = /* GraphQL */ `
    query ListSenderProfiles {
      listSenderProfiles {
        id
        name
        email
        replyTo
        isDefault
        createdAt
      }
    }
  `
  const { data } = await client.graphql({ query }) as { data: { listSenderProfiles: SenderProfile[] } }
  return data.listSenderProfiles ?? []
}

export async function createSenderProfile(input: { name: string; email: string; replyTo?: string; isDefault?: boolean }): Promise<SenderProfile> {
  const mutation = /* GraphQL */ `
    mutation CreateSenderProfile($input: CreateSenderProfileInput!) {
      createSenderProfile(input: $input) {
        id name email replyTo isDefault createdAt
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { input } }) as { data: { createSenderProfile: SenderProfile } }
  return data.createSenderProfile
}

export async function deleteSenderProfile(id: string): Promise<boolean> {
  const mutation = /* GraphQL */ `
    mutation DeleteSenderProfile($id: ID!) {
      deleteSenderProfile(id: $id)
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { id } }) as { data: { deleteSenderProfile: boolean } }
  return data.deleteSenderProfile
}

// ── Configuration Sets ───────────────────────────────────────────────────────

export async function listConfigurationSets(): Promise<string[]> {
  const query = /* GraphQL */ `
    query ListConfigurationSets {
      listConfigurationSets
    }
  `
  const { data } = await client.graphql({ query }) as { data: { listConfigurationSets: string[] } }
  return data.listConfigurationSets ?? []
}

export async function getDefaultConfigurationSet(): Promise<string | null> {
  const query = /* GraphQL */ `
    query GetDefaultConfigurationSet {
      getDefaultConfigurationSet
    }
  `
  const { data } = await client.graphql({ query }) as { data: { getDefaultConfigurationSet: string | null } }
  return data.getDefaultConfigurationSet
}

export async function setDefaultConfigurationSet(name: string | null): Promise<boolean> {
  const mutation = /* GraphQL */ `
    mutation SetDefaultConfigurationSet($name: String) {
      setDefaultConfigurationSet(name: $name)
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { name } }) as { data: { setDefaultConfigurationSet: boolean } }
  return data.setDefaultConfigurationSet
}

// ── Cognito Users ────────────────────────────────────────────────────────────

export async function listUsers(): Promise<CognitoUser[]> {
  const query = /* GraphQL */ `
    query ListUsers {
      listUsers {
        username
        email
        name
        status
        enabled
        groups
        createdAt
        updatedAt
      }
    }
  `
  const { data } = await client.graphql({ query }) as { data: { listUsers: CognitoUser[] } }
  return data.listUsers ?? []
}

export async function createUser(input: CreateUserInput): Promise<CognitoUser> {
  const mutation = /* GraphQL */ `
    mutation CreateUser($input: CreateUserInput!) {
      createUser(input: $input) {
        username email name status enabled groups createdAt updatedAt
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { input } }) as { data: { createUser: CognitoUser } }
  return data.createUser
}

export async function updateUser(username: string, input: UpdateUserInput): Promise<CognitoUser> {
  const mutation = /* GraphQL */ `
    mutation UpdateUser($username: String!, $input: UpdateUserInput!) {
      updateUser(username: $username, input: $input) {
        username email name status enabled groups createdAt updatedAt
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { username, input } }) as { data: { updateUser: CognitoUser } }
  return data.updateUser
}

export async function deleteUser(username: string): Promise<boolean> {
  const mutation = /* GraphQL */ `
    mutation DeleteUser($username: String!) {
      deleteUser(username: $username)
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { username } }) as { data: { deleteUser: boolean } }
  return data.deleteUser
}

export async function addUserToGroup(username: string, group: string): Promise<boolean> {
  const mutation = /* GraphQL */ `
    mutation AddUserToGroup($username: String!, $group: String!) {
      addUserToGroup(username: $username, group: $group)
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { username, group } }) as { data: { addUserToGroup: boolean } }
  return data.addUserToGroup
}

export async function removeUserFromGroup(username: string, group: string): Promise<boolean> {
  const mutation = /* GraphQL */ `
    mutation RemoveUserFromGroup($username: String!, $group: String!) {
      removeUserFromGroup(username: $username, group: $group)
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { username, group } }) as { data: { removeUserFromGroup: boolean } }
  return data.removeUserFromGroup
}

export async function resetUserPassword(username: string): Promise<boolean> {
  const mutation = /* GraphQL */ `
    mutation ResetUserPassword($username: String!) {
      resetUserPassword(username: $username)
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { username } }) as { data: { resetUserPassword: boolean } }
  return data.resetUserPassword
}

// ── Cognito Groups ───────────────────────────────────────────────────────────

export async function listGroups(): Promise<CognitoGroup[]> {
  const query = /* GraphQL */ `
    query ListGroups {
      listGroups {
        name
        description
        precedence
        createdAt
        updatedAt
      }
    }
  `
  const { data } = await client.graphql({ query }) as { data: { listGroups: CognitoGroup[] } }
  return data.listGroups ?? []
}
