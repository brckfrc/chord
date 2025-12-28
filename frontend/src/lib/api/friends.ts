import { api } from "../api"
import { type UserDto } from "./auth"

export interface FriendDto {
  id: string
  username: string
  displayName: string
  status: number // UserStatus enum value
  customStatus?: string
  avatarUrl?: string
}

export interface FriendshipResponseDto {
  id: string
  requesterId: string
  addresseeId: string
  status: number // FriendshipStatus: 0 = Pending, 1 = Accepted, 2 = Blocked
  createdAt: string
  acceptedAt?: string
  otherUser: UserDto
}

export interface FriendRequestDto {
  username: string
}

export const friendsApi = {
  /**
   * Get all accepted friends
   */
  getFriends: async (): Promise<FriendshipResponseDto[]> => {
    const response = await api.get<FriendshipResponseDto[]>("/friends")
    return response.data
  },

  /**
   * Get online friends only (status = 0)
   */
  getOnlineFriends: async (): Promise<FriendshipResponseDto[]> => {
    const friends = await friendsApi.getFriends()
    return friends.filter((f) => f.otherUser.status === 0)
  },

  /**
   * Get all pending friend requests (both sent and received)
   */
  getPendingRequests: async (): Promise<FriendshipResponseDto[]> => {
    const response = await api.get<FriendshipResponseDto[]>("/friends/pending")
    return response.data
  },

  /**
   * Get all blocked users
   */
  getBlockedUsers: async (): Promise<FriendshipResponseDto[]> => {
    const response = await api.get<FriendshipResponseDto[]>("/friends/blocked")
    return response.data
  },

  /**
   * Send a friend request by username
   */
  sendFriendRequest: async (username: string): Promise<FriendshipResponseDto> => {
    const response = await api.post<FriendshipResponseDto>("/friends/request", { username })
    return response.data
  },

  /**
   * Accept a pending friend request
   */
  acceptFriendRequest: async (requestId: string): Promise<FriendshipResponseDto> => {
    const response = await api.post<FriendshipResponseDto>(`/friends/${requestId}/accept`)
    return response.data
  },

  /**
   * Decline a pending friend request
   */
  declineFriendRequest: async (requestId: string): Promise<void> => {
    await api.post(`/friends/${requestId}/decline`)
  },

  /**
   * Remove a friend
   */
  removeFriend: async (friendId: string): Promise<void> => {
    await api.delete(`/friends/${friendId}`)
  },

  /**
   * Block a user
   */
  blockUser: async (userId: string): Promise<FriendshipResponseDto> => {
    const response = await api.post<FriendshipResponseDto>(`/friends/${userId}/block`)
    return response.data
  },

  /**
   * Unblock a user
   */
  unblockUser: async (userId: string): Promise<void> => {
    await api.delete(`/friends/${userId}/block`)
  },
}

