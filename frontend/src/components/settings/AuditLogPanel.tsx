import { useEffect, useState } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchAuditLogs } from "@/store/slices/auditLogsSlice"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { formatAuditLogTime } from "@/lib/dateUtils"

interface AuditLogPanelProps {
  guildId: string
}

export function AuditLogPanel({ guildId }: AuditLogPanelProps) {
  const dispatch = useAppDispatch()
  const { logsByGuild, paginationByGuild, isLoading, error } = useAppSelector(
    (state) => state.auditLogs
  )
  const logs = logsByGuild[guildId] || []
  const pagination = paginationByGuild[guildId]
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 50

  // Reset to page 1 when guildId changes
  useEffect(() => {
    setCurrentPage(1)
  }, [guildId])

  useEffect(() => {
    dispatch(fetchAuditLogs({ guildId, limit: pageSize, page: currentPage }))
  }, [guildId, currentPage, dispatch])

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (pagination?.hasMore) {
      setCurrentPage(currentPage + 1)
    }
  }

  if (isLoading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p className="text-sm">No audit logs found</p>
      </div>
    )
  }

  const totalPages = pagination
    ? Math.ceil(pagination.totalCount / pagination.pageSize)
    : 1

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex-1 space-y-2 overflow-y-auto">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-center gap-4 p-3 rounded-md hover:bg-[#2b2d31] transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {log.actionName}
                </span>
                <span className="text-sm text-muted-foreground">by</span>
                <span className="text-sm font-medium text-foreground">
                  {log.username}
                </span>
              </div>
              {log.targetType && (
                <p className="text-xs text-muted-foreground mt-1">
                  {log.targetType}
                </p>
              )}
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {formatAuditLogTime(log.timestamp)}
            </div>
          </div>
        ))}
      </div>

      {pagination && pagination.totalCount > pageSize && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1}-
            {Math.min(currentPage * pageSize, pagination.totalCount)} of{" "}
            {pagination.totalCount} logs
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm text-muted-foreground min-w-[80px] text-center">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!pagination.hasMore || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
