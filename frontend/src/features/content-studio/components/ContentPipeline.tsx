import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { pipeline } from '../data/mock'

export function ContentPipeline() {
  return (
    <Card data-presentation-target='content-studio.content-pipeline'>
      <CardHeader>
        <CardTitle>Content Pipeline</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pipeline.map((item) => (
            <div
              key={item.stage}
              className="rounded-xl border p-6 text-center"
            >
              <p className="text-sm text-muted-foreground">
                {item.stage}
              </p>

              <h2 className="mt-2 text-4xl font-bold">
                {item.total}
              </h2>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
