import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2 } from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useSubmitLead } from '../hooks/use-submit-lead'

const COMPANY_SIZE_OPTIONS = ['1-10', '11-50', '51-200', '201-1000', '1000+']
const BUDGET_OPTIONS = [
  'Under $5,000',
  '$5,000 - $20,000',
  '$20,000 - $50,000',
  '$50,000+',
]

// contactName/email/phone/company/industry/companySize map onto the
// backend's structured Lead columns 1:1 (see backend/src/dto/crm-lead.dto.ts
// CreateLeadDto). country/website/budget/message have no structured column
// — the backend already captures any extra body fields verbatim in
// Lead.rawSubmission (an existing Json audit column), so they're collected
// here but not currently used by AI qualification.
const leadFormSchema = z.object({
  contactName: z
    .string()
    .trim()
    .min(1, 'Please enter your name.')
    .max(200, 'Name must be 200 characters or fewer.'),
  email: z.email('Please enter a valid email address.'),
  phone: z.string().trim().max(50).optional().or(z.literal('')),
  company: z.string().trim().max(200).optional().or(z.literal('')),
  country: z.string().trim().max(100).optional().or(z.literal('')),
  website: z.string().trim().max(200).optional().or(z.literal('')),
  companySize: z.string().optional().or(z.literal('')),
  budget: z.string().optional().or(z.literal('')),
  industry: z.string().trim().max(200).optional().or(z.literal('')),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
})

type LeadFormValues = z.infer<typeof leadFormSchema>

const DEFAULT_VALUES: LeadFormValues = {
  contactName: '',
  email: '',
  phone: '',
  company: '',
  country: '',
  website: '',
  companySize: '',
  budget: '',
  industry: '',
  message: '',
}

function extractErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const serverMessage = (error.response?.data as { message?: string } | undefined)
      ?.message
    if (serverMessage) return serverMessage
  }
  return 'Something went wrong submitting your message. Please try again.'
}

export function LeadCaptureForm() {
  const submitLead = useSubmitLead()

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  function onSubmit(values: LeadFormValues) {
    const payload = {
      contactName: values.contactName,
      email: values.email,
      ...(values.phone && { phone: values.phone }),
      ...(values.company && { company: values.company }),
      ...(values.industry && { industry: values.industry }),
      ...(values.companySize && { companySize: values.companySize }),
      ...(values.country && { country: values.country }),
      ...(values.website && { website: values.website }),
      ...(values.budget && { budget: values.budget }),
      ...(values.message && { message: values.message }),
    }

    submitLead.mutate(payload, {
      onSuccess: () => {
        toast.success("Thanks — we'll be in touch soon.")
        form.reset(DEFAULT_VALUES)
      },
      onError: (error) => {
        toast.error(extractErrorMessage(error))
      },
    })
  }

  if (submitLead.isSuccess) {
    return (
      <Card>
        <CardContent className='flex flex-col items-center gap-3 py-12 text-center'>
          <CheckCircle2 className='h-10 w-10 text-primary' />
          <p className='text-lg font-semibold'>Message received.</p>
          <p className='max-w-sm text-sm text-muted-foreground'>
            Thanks for reaching out — we&apos;ll review your message and get back to
            you shortly.
          </p>
          <Button variant='outline' onClick={() => submitLead.reset()}>
            Send another message
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Get in Touch</CardTitle>
        <CardDescription>
          Tell us a bit about your project and we&apos;ll follow up.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
            noValidate
          >
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='contactName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Jane Doe' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type='email' placeholder='jane@company.com' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='phone'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder='(555) 555-5555' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='company'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder='Acme Inc.' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='country'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder='United States' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='website'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder='https://your-company.com' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='companySize'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Size</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select a range' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMPANY_SIZE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='budget'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select a range' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BUDGET_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='industry'
                render={({ field }) => (
                  <FormItem className='sm:col-span-2'>
                    <FormLabel>Service Interested In</FormLabel>
                    <FormControl>
                      <Input placeholder='e.g. AI Automation, Content Studio' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='message'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Tell us about your project...'
                      className='min-h-32'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type='submit'
              className='w-full sm:w-auto'
              disabled={submitLead.isPending}
            >
              {submitLead.isPending ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
