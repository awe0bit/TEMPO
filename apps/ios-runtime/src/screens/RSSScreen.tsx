import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { NativeChromeGap, PrimaryButton, Screen, Sheet } from '../components/Primitives';
import { relativeTime, t } from '../i18n';
import { radius, type TempoTheme } from '../theme';
import type { RSSArticle, RSSFolder, RSSSubscription, TempoCommand } from '../types';

export function RSSScreen({ theme, articles, subscriptions, folders, phase, command, consumeCommand, perform }: {
  theme: TempoTheme; articles: RSSArticle[]; subscriptions: RSSSubscription[]; folders: RSSFolder[]; phase: string;
  command?: TempoCommand; consumeCommand: () => void; perform: <T>(action: string, payload?: Record<string, unknown>) => Promise<T>;
}) {
  const [query, setQuery] = useState(''); const [searchActive, setSearchActive] = useState(false); const [feed, setFeed] = useState<string>(); const [article, setArticle] = useState<RSSArticle>(); const [adding, setAdding] = useState(false); const [url, setURL] = useState('');
  useEffect(() => {
    if (command?.type === 'search') {
      setQuery(command.query ?? '');
      setSearchActive(command.active ?? false);
    }
    if (command?.type === 'addFeed') setAdding(true);
    if (command?.type === 'refreshFeeds') void perform('rss.refresh');
    if (command?.type === 'markAllRead') void perform('rss.markAllRead', feed ? { feedID: feed } : undefined);
    if (command) consumeCommand();
  }, [command, consumeCommand]);
  const shown = useMemo(() => articles.filter((item) => !feed || item.feedID === feed).filter((item) => `${item.title} ${item.feedTitle} ${item.summary}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => (b.publishedAt ?? b.fetchedAt).localeCompare(a.publishedAt ?? a.fetchedAt)), [articles, feed, query]);
  const unreadCount = articles.filter((item) => !item.isRead).length;
  return <Screen theme={theme}>
    <NativeChromeGap title={searchActive ? undefined : 'RSS'} theme={theme} />
    <FlatList
      style={styles.articleList}
      data={shown}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={phase === 'refreshing'} onRefresh={() => perform('rss.refresh')} tintColor={theme.accent} />}
      contentContainerStyle={shown.length ? styles.articles : styles.empty}
      ListHeaderComponent={<View style={styles.headerControls}>
        <View style={styles.statusRow}>
          <Text numberOfLines={1} style={[styles.statusText, { color: theme.secondary }]}>{t('rss.sources', { count: subscriptions.length })}{folders.length ? ` · ${t('rss.folders', { count: folders.length })}` : ''}{unreadCount ? ` · ${t('rss.unread', { count: unreadCount })}` : ''}</Text>
          {phase === 'refreshing' ? <ActivityIndicator size="small" color={theme.accent} /> : null}
        </View>
        <FlatList horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} data={[{ id: '', title: t('common.all') }, ...subscriptions]} keyExtractor={(item) => item.id} renderItem={({ item }) => { const selected = feed === (item.id || undefined); return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setFeed(item.id || undefined)} style={({ pressed }) => [styles.filter, { backgroundColor: selected ? theme.accentSoft : theme.surfaceMuted }, pressed && styles.filterPressed]}><Text style={{ color: selected ? theme.accent : theme.secondary, fontWeight: '600' }}>{item.title}</Text></Pressable>; }} />
      </View>}
      ListEmptyComponent={<View style={styles.emptyState}><Text style={[styles.emptyText, { color: theme.secondary }]}>{t('rss.empty')}</Text></View>}
      renderItem={({ item, index }) => <ArticleRow theme={theme} article={item} first={index === 0} last={index === shown.length - 1} onPress={async () => { const full = await perform<RSSArticle>('rss.article', { id: item.id }); setArticle(full); }} />}
    />
    <Sheet visible={!!article} onClose={() => setArticle(undefined)} theme={theme} snapPoints={['92%']}>{article ? <Reader theme={theme} article={article} perform={perform} /> : null}</Sheet>
    <Sheet visible={adding} onClose={() => setAdding(false)} theme={theme} snapPoints={['48%', '82%']}><View style={styles.addBody}><Text style={[styles.sheetTitle, { color: theme.text }]}>{t('rss.addTitle')}</Text><TextInput autoCapitalize="none" keyboardType="url" value={url} onChangeText={setURL} placeholder="https://example.com/feed.xml" placeholderTextColor={theme.tertiary} style={[styles.urlInput, { color: theme.text, backgroundColor: theme.surfaceMuted }]} /><PrimaryButton theme={theme} label={t('rss.add')} disabled={!url.trim()} onPress={async () => { await perform('rss.add', { url: url.trim() }); setURL(''); setAdding(false); }} /></View></Sheet>
  </Screen>;
}
function ArticleRow({ theme, article, first, last, onPress }: { theme: TempoTheme; article: RSSArticle; first: boolean; last: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.article, first && styles.articleFirst, last && styles.articleLast, { backgroundColor: pressed ? theme.surfaceMuted : theme.surface }]}><View style={styles.articleMeta}><View style={styles.feedLine}>{!article.isRead ? <View style={[styles.unreadDot, { backgroundColor: theme.accent }]} /> : null}<Text style={[styles.feed, { color: theme.secondary }]}>{article.feedTitle}</Text></View><Text style={[styles.date, { color: theme.tertiary }]}>{relativeTime(article.publishedAt ?? article.fetchedAt)}</Text></View><Text numberOfLines={2} style={[styles.articleTitle, { color: theme.text, fontWeight: article.isRead ? '500' : '600' }]}>{article.title}</Text><Text numberOfLines={2} style={[styles.summary, { color: theme.secondary }]}>{stripHTML(article.summary)}</Text>{!last ? <View style={[styles.articleDivider, { backgroundColor: theme.separator }]} /> : null}</Pressable>; }
function Reader({ theme, article, perform }: { theme: TempoTheme; article: RSSArticle; perform: <T>(action: string, payload?: Record<string, unknown>) => Promise<T> }) {
  const web = useRef<WebView>(null); const [loading, setLoading] = useState(false); const [summary, setSummary] = useState('');
  async function translate() { setLoading(true); web.current?.injectJavaScript(EXTRACT_SCRIPT); }
  async function message(event: { nativeEvent: { data: string } }) { try { const data = JSON.parse(event.nativeEvent.data) as { type: string; segments: string[] }; if (data.type !== 'tempoTranslate') return; const translated = await perform<string[]>('rss.translate', { segments: data.segments }); web.current?.injectJavaScript(`window.__tempoApply(${JSON.stringify(translated)});true;`); } finally { setLoading(false); } }
  const appearanceScript = readerAppearanceScript(theme);
  return <View style={styles.reader}><View style={[styles.readerToolbar, { backgroundColor: theme.surface }]}><Pressable onPress={async () => { setLoading(true); try { setSummary(await perform<string>('rss.summarize', { id: article.id })); } finally { setLoading(false); } }}><Text style={[styles.tool, { color: theme.accent }]}>{t('rss.aiSummary')}</Text></Pressable><Pressable onPress={translate}><Text style={[styles.tool, { color: theme.accent }]}>{t('rss.translate')}</Text></Pressable>{loading ? <ActivityIndicator color={theme.accent} /> : null}</View>{summary ? <View style={[styles.summaryBox, { backgroundColor: theme.surface }]}><Text style={[styles.summaryText, { color: theme.text }]}>{summary}</Text></View> : null}<WebView key={theme.dark ? 'dark' : 'light'} ref={web} source={article.link ? { uri: article.link } : { html: article.content ?? article.summary }} onMessage={message} injectedJavaScriptBeforeContentLoaded={appearanceScript} injectedJavaScript={appearanceScript} sharedCookiesEnabled allowsBackForwardNavigationGestures style={{ backgroundColor: theme.background }} /></View>;
}
function readerAppearanceScript(theme: TempoTheme) {
  const mode = theme.dark ? 'dark' : 'light';
  return `(function(){var s=document.getElementById('tempo-reader-style')||document.createElement('style');s.id='tempo-reader-style';s.textContent=${JSON.stringify(`:root{color-scheme:${mode}}html,body{background:${theme.background}!important;color:${theme.text}!important}header,nav,footer,aside,.sidebar,.newsletter,.cookie,.social-share{display:none!important}body{max-width:760px;margin:auto;padding:20px;font:18px/1.75 -apple-system,BlinkMacSystemFont,sans-serif}main,article,.post,.entry-content,.article-content{background:transparent!important;color:${theme.text}!important}p,li,blockquote,h1,h2,h3,h4,h5,h6{color:inherit!important}a{color:${theme.accent}!important}img{max-width:100%;height:auto}`)};document.head.appendChild(s);document.documentElement.style.background=${JSON.stringify(theme.background)};document.body.style.background=${JSON.stringify(theme.background)};window.__tempoApply=function(v){var n=[].slice.call(document.querySelectorAll('article p,article li,main p,main li'));n.forEach(function(x,i){if(v[i])x.textContent=v[i]})}})();true;`;
}
const EXTRACT_SCRIPT = `(function(){var n=[].slice.call(document.querySelectorAll('article p,article li,main p,main li')).filter(function(x){return x.innerText.trim().length>2});window.ReactNativeWebView.postMessage(JSON.stringify({type:'tempoTranslate',segments:n.map(function(x){return x.innerText.trim()}).slice(0,120)}))})();true;`;
function stripHTML(value: string) { return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
const styles = StyleSheet.create({ headerControls: { paddingTop: 14 }, statusRow: { minHeight: 28, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center' }, statusText: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 18 }, filters: { paddingTop: 8, paddingBottom: 16, gap: 8 }, filter: { height: 32, borderRadius: 16, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' }, filterPressed: { opacity: .7, transform: [{ scale: .94 }] }, articleList: { flex: 1, marginHorizontal: 20 }, articles: { paddingBottom: 106 }, article: { paddingHorizontal: 16, paddingVertical: 14 }, articleFirst: { borderTopLeftRadius: 22, borderTopRightRadius: 22 }, articleLast: { borderBottomLeftRadius: 22, borderBottomRightRadius: 22 }, articleDivider: { position: 'absolute', height: StyleSheet.hairlineWidth, left: 16, right: 16, bottom: 0 }, articleMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }, feedLine: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 }, unreadDot: { width: 6, height: 6, borderRadius: 3, marginRight: 7 }, feed: { fontSize: 12.5, fontWeight: '500', flexShrink: 1 }, date: { fontSize: 12, marginLeft: 12 }, articleTitle: { fontSize: 16, lineHeight: 21, letterSpacing: -.16 }, summary: { fontSize: 13.5, lineHeight: 18, marginTop: 4 }, empty: { flexGrow: 1, paddingBottom: 106 }, emptyState: { flex: 1, minHeight: 320, alignItems: 'center', justifyContent: 'center', paddingBottom: 46 }, emptyText: { textAlign: 'center', fontSize: 15, lineHeight: 22, paddingHorizontal: 20 }, addBody: { flex: 1, paddingTop: 12 }, sheetTitle: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -.45, paddingHorizontal: 24, marginBottom: 20 }, urlInput: { marginHorizontal: 20, borderRadius: radius.large, height: 60, paddingHorizontal: 20, marginBottom: 18, fontSize: 17 }, reader: { flex: 1, paddingTop: 12 }, readerToolbar: { height: 54, marginHorizontal: 20, marginBottom: 12, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 }, tool: { fontSize: 16, fontWeight: '500' }, summaryBox: { marginHorizontal: 20, borderRadius: 24, padding: 18, marginBottom: 12 }, summaryText: { fontSize: 15, lineHeight: 22 }, });
