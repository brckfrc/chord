import { createSlice } from "@reduxjs/toolkit"

interface ChannelsState {
  channels: any[]
  selectedChannelId: string | null
}

const initialState: ChannelsState = {
  channels: [],
  selectedChannelId: null,
}

const channelsSlice = createSlice({
  name: "channels",
  initialState,
  reducers: {
    setChannels: (state, action) => {
      state.channels = action.payload
    },
    setSelectedChannel: (state, action) => {
      state.selectedChannelId = action.payload
    },
  },
})

export const { setChannels, setSelectedChannel } = channelsSlice.actions
export default channelsSlice.reducer


