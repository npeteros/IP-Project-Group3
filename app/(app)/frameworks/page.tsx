import { FrameworkGallery } from '@/components/frameworks'
import { FRAMEWORKS_PAGE } from '@/src/lib/constants'
import { typography } from '@/src/lib/typography'

export default function FrameworksPage() {
  return (
    <div className="flex flex-col px-5 pt-7 pb-8 md:px-10 lg:px-14 lg:pt-12 lg:pb-12">
      <h1 className={typography.pageTitle}>{FRAMEWORKS_PAGE.title}</h1>
      <p
        className={`${typography.bodySmall} mt-2.5 mb-3.5 max-w-[560px] lg:mt-2 lg:mb-7 lg:text-[15px] lg:leading-[1.6]`}
      >
        {FRAMEWORKS_PAGE.description}
      </p>

      <FrameworkGallery />
    </div>
  )
}
