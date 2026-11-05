import { getCategoryById, categoryEconomics, getCategoriesSync } from './Categories.js';
import { createCompetitorForCategory } from './Competitor.js';
import { adjustSentiment } from './Sentiment.js';
import { createInitialNews } from './News.js';
import { dealMonthlyTasks } from './Tasks.js';

export function canPivot(state) {
  return Boolean(!state.flags?.pivotUsed && !state.flags?.ipoFiled && !state.flags?.gameOver);
}

export function applyPivot(state, newCategoryId) {
  if (!canPivot(state)) {
    if (state.flags?.pivotUsed) {
      return { ok: false, reason: 'You already pivoted once this run.' };
    }
    return { ok: false, reason: 'Pivot is not available right now.' };
  }

  const cat = getCategoryById(newCategoryId, getCategoriesSync());
  if (!cat) return { ok: false, reason: 'Pick an industry from the list.' };
  if (cat.id === state.company.categoryId) {
    return { ok: false, reason: 'Pick a different industry than you are in now.' };
  }

  const oldLabel = state.company.categoryLabel;
  state.company.categoryId = cat.id;
  state.company.categoryLabel = cat.label;
  state.company.economics = categoryEconomics(cat);
  state.world.competitor = createCompetitorForCategory(cat.id);
  state.product.buzz = Math.max(0, (state.product.buzz ?? 0) - 4);
  if (state.flags?.seriesAClosed) {
    adjustSentiment(state, -6, 'Board side-eyes the pivot.');
  }
  state.flags.pivotUsed = true;

  if (!state.news) state.news = createInitialNews();
  const article = {
    id: `pivot-${Date.now()}`,
    headline: `${state.company.name} pivots from ${oldLabel} to ${cat.label}`,
    dek: 'Same team, new pitch deck, fresh buzz penalty.',
    body: `The Financier Times notes the repositioning. ProNet commentators debate whether it is vision or panic. Your Desk tasks will skew toward the new industry next month.`,
    source: 'The Financier Times',
    date: `Y${state.calendar.year} M${state.calendar.monthIndex}`
  };
  state.news.currentMonthArticles = [article, ...(state.news.currentMonthArticles ?? [])].slice(
    0,
    4
  );
  state.news.unreadCount = Math.min(9, (state.news.unreadCount ?? 0) + 1);

  dealMonthlyTasks(state);

  return { ok: true, oldLabel, newLabel: cat.label };
}
