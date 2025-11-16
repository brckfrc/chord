import { createSlice } from "@reduxjs/toolkit"

interface GuildsState {
  guilds: any[]
  selectedGuildId: string | null
}

const initialState: GuildsState = {
  guilds: [],
  selectedGuildId: null,
}

const guildsSlice = createSlice({
  name: "guilds",
  initialState,
  reducers: {
    setGuilds: (state, action) => {
      state.guilds = action.payload
    },
    setSelectedGuild: (state, action) => {
      state.selectedGuildId = action.payload
    },
  },
})

export const { setGuilds, setSelectedGuild } = guildsSlice.actions
export default guildsSlice.reducer


