export interface CreateInviteDto {
  expiresAt?: string // ISO date string
  maxUses?: number
}

export interface InviteResponseDto {
  id: string
  code: string
  guildId: string
  guildName: string
  guildIconUrl?: string
  createdByUserId: string
  createdByUsername: string
  createdAt: string
  expiresAt?: string
  maxUses?: number
  uses: number
  isActive: boolean
}

export interface InviteInfoDto {
  code: string
  guildId: string
  guildName: string
  guildIconUrl?: string
  guildDescription?: string
  memberCount: number
  createdByUserId: string
  createdByUsername: string
  createdAt: string
  expiresAt?: string
  maxUses?: number
  uses: number
  isActive: boolean
  isExpired: boolean
  isMaxUsesReached: boolean
}

