// import { api } from "../api" // TODO: Uncomment when backend is ready
import { type UserDto } from "./auth"

export interface FriendDto {
  id: string
  username: string
  displayName: string
  status: number // UserStatus enum value
  customStatus?: string
  avatarUrl?: string
}

export interface FriendRequestDto {
  id: string
  requesterId: string
  addresseeId: string
  status: "Pending" | "Accepted" | "Blocked"
  createdAt: string
  requester?: UserDto
  addressee?: UserDto
}

// Mock data for now - will be replaced with real API calls when backend is ready
const mockFriends: FriendDto[] = [
  {
    id: "mock-1",
    username: "johndoe",
    displayName: "John Doe",
    status: 0, // Online
    customStatus: "Playing games",
  },
  {
    id: "mock-2",
    username: "janedoe",
    displayName: "Jane Doe",
    status: 1, // Idle
  },
  {
    id: "mock-3",
    username: "bobsmith",
    displayName: "Bob Smith",
    status: 4, // Offline
  },
]

const mockPendingRequests: FriendRequestDto[] = []

export const friendsApi = {
  // Mock functions - will be replaced with real API calls
  getFriends: async (): Promise<FriendDto[]> => {
    // TODO: Replace with: const response = await api.get<FriendDto[]>("/friends")
    // return response.data
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockFriends), 500)
    })
  },

  getOnlineFriends: async (): Promise<FriendDto[]> => {
    // TODO: Replace with real API call
    const friends = await friendsApi.getFriends()
    return friends.filter((f) => f.status === 0) // Online status
  },

  getPendingRequests: async (): Promise<FriendRequestDto[]> => {
    // TODO: Replace with: const response = await api.get<FriendRequestDto[]>("/friends/pending")
    // return response.data
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockPendingRequests), 500)
    })
  },

  sendFriendRequest: async (_username: string): Promise<void> => {
    // TODO: Replace with: await api.post("/friends/request", { username })
    return new Promise((resolve) => {
      setTimeout(() => resolve(), 500)
    })
  },

  acceptFriendRequest: async (_requestId: string): Promise<void> => {
    // TODO: Replace with: await api.post(`/friends/${requestId}/accept`)
    return new Promise((resolve) => {
      setTimeout(() => resolve(), 500)
    })
  },

  declineFriendRequest: async (_requestId: string): Promise<void> => {
    // TODO: Replace with: await api.post(`/friends/${requestId}/decline`)
    return new Promise((resolve) => {
      setTimeout(() => resolve(), 500)
    })
  },

  removeFriend: async (_friendId: string): Promise<void> => {
    // TODO: Replace with: await api.delete(`/friends/${friendId}`)
    return new Promise((resolve) => {
      setTimeout(() => resolve(), 500)
    })
  },
}

