import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { quickActions } from '../data/mock'

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <div
              key={action.title}
              className="rounded-xl border p-6 transition-all hover:shadow-md cursor-pointer"
            >
              <div className="mb-4 text-4xl">
                {action.icon}
              </div>

              <h3 className="font-semibold">
                {action.title}
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                {action.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
