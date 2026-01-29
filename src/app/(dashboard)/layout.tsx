export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <span className="text-lg font-semibold">SparkVotEDU</span>
        {/* Sign-out button will be added in Plan 04 */}
      </header>
      <div className="flex flex-1">
        {/* Sidebar placeholder -- will be expanded in later phases */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
