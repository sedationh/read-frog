import { PageLayout } from '../../components/page-layout'
import AnkiConfig from './anki-config'
import { ReadConfig } from './read-config'
import TranslationConfig from './translation-config'

export function GeneralPage() {
  return (
    <PageLayout title={i18n.t('options.general.title')} innerClassName="[&>*]:border-b [&>*:last-child]:border-b-0">
      <ReadConfig />
      <TranslationConfig />
      <AnkiConfig />
    </PageLayout>
  )
}
