// import { api } from "../api" // TODO: Uncomment when backend is ready
import { type UserDto } from "./auth"

export interface DMDto {
  id: string
  userId: string
  otherUserId: string
  otherUser?: UserDto
  lastMessage?: {
    id: string
    content: string
    createdAt: string
  }
  unreadCount: number
  createdAt: string
}

// Mock data for now - will be replaced with real API calls when backend is ready
const mockDMs: DMDto[] = [
  {
    id: "dm-1",
    userId: "current-user",
    otherUserId: "mock-1",
    otherUser: {
      id: "mock-1",
      email: "john@example.com",
      username: "johndoe",
      displayName: "John Doe",
      status: 0, // Online
      customStatus: "Playing games",
      createdAt: new Date().toISOString(),
    },
    lastMessage: {
      id: "msg-1",
      content: "Hey, how are you?",
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    },
    unreadCount: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: "dm-2",
    userId: "current-user",
    otherUserId: "mock-2",
    otherUser: {
      id: "mock-2",
      email: "jane@example.com",
      username: "janedoe",
      displayName: "Jane Doe",
      status: 1, // Idle
      createdAt: new Date().toISOString(),
    },
    lastMessage: {
      id: "msg-2",
      content: "See you later!",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    },
    unreadCount: 0,
    createdAt: new Date().toISOString(),
  },
]

export const dmsApi = {
  // Mock functions - will be replaced with real API calls
  getDMs: async (): Promise<DMDto[]> => {
    // TODO: Replace with: const response = await api.get<DMDto[]>("/users/me/dms")
    // return response.data
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockDMs), 500)
    })
  },

  getDMById: async (dmId: string): Promise<DMDto> => {
    // TODO: Replace with: const response = await api.get<DMDto>(`/dms/${dmId}`)
    // return response.data
    const dm = mockDMs.find((d) => d.id === dmId)
    if (!dm) throw new Error("DM not found")
    return new Promise((resolve) => {
      setTimeout(() => resolve(dm), 500)
    })
  },

  createDM: async (userId: string): Promise<DMDto> => {
    // TODO: Replace with: const response = await api.post<DMDto>(`/users/${userId}/dm`)
    // return response.data
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: `dm-${Date.now()}`,
          userId: "current-user",
          otherUserId: userId,
          unreadCount: 0,
          createdAt: new Date().toISOString(),
        })
      }, 500)
    })
  },
}

