import { createTRPCReact } from '@trpc/react-query'
import { ipcLink } from 'electron-trpc/renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AppRouter } from '../../main/trpc/router'

export const trpc = createTRPCReact<AppRouter>()

const queryClient = new QueryClient()
const trpcClient = trpc.createClient({
  links: [ipcLink()]
})

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}
