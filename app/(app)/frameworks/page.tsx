import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui";
import { FRAMEWORKS, FRAMEWORKS_PAGE } from "@/lib/constants";
import { typography } from "@/lib/typography";
 
export default function FrameworksPage() {
  return (
    <div className="flex flex-col px-5 pt-7 pb-8 md:px-10 lg:px-14 lg:pt-12 lg:pb-12">
      <h1 className={typography.pageTitle}>{FRAMEWORKS_PAGE.title}</h1>
      <p className={`${typography.bodySmall} mt-2.5 mb-3.5 max-w-[560px] lg:mt-2 lg:mb-7 lg:text-[15px] lg:leading-[1.6]`}>
        {FRAMEWORKS_PAGE.description}
      </p>
 
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
        {FRAMEWORKS.map((framework) => (
          <Card
            key={framework.id}
            className="flex items-center gap-3.5 rounded-[14px] p-4 md:flex-col md:items-start md:rounded-2xl md:p-[22px]"
          >
            <div className="flex size-10 flex-none items-center justify-center rounded-[11px] bg-sage-100 text-sage-700 md:size-11 md:rounded-xl">
              <Icon name={framework.icon} size={20} strokeWidth={1.75} />
            </div>
            <div className="flex flex-1 flex-col gap-0.5 md:gap-1">
              <h3 className={typography.cardTitle}>{framework.name}</h3>
              <p className="text-xs leading-[1.4] text-neutral-600 md:text-[13px] md:leading-[1.5]">
                {framework.description}
              </p>
            </div>
            <span className="text-[11px] leading-none font-medium text-neutral-400 md:mt-auto md:text-xs">{framework.duration}</span>
          </Card>
        ))}
 
        <button
          type="button"
          className="flex items-center gap-3.5 rounded-[14px] border-[1.5px] border-dashed border-sage-200 p-4 text-sage-700 md:min-h-[180px] md:flex-col md:justify-center md:gap-2.5 md:rounded-2xl md:p-[22px]"
        >
          <span className="flex size-10 flex-none items-center justify-center md:size-auto">
            <Icon name="plus" size={20} />
          </span>
          <span className="text-sm leading-[1.3] font-semibold">{FRAMEWORKS_PAGE.buildYourOwnLabel}</span>
        </button>
      </div>
    </div>
  );
}