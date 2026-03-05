import { generateClient } from 'aws-amplify/api'
import type { VerifiedIdentity } from '@/features/templates/types'

const client = generateClient()

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
  const { data } = await client.graphql({
    query: mutation,
    variables: { email },
  }) as { data: { requestEmailVerification: boolean } }
  return data.requestEmailVerification
}

export async function deleteVerifiedIdentity(identity: string): Promise<boolean> {
  const mutation = /* GraphQL */ `
    mutation DeleteVerifiedIdentity($identity: String!) {
      deleteVerifiedIdentity(identity: $identity)
    }
  `
  const { data } = await client.graphql({
    query: mutation,
    variables: { identity },
  }) as { data: { deleteVerifiedIdentity: boolean } }
  return data.deleteVerifiedIdentity
}
