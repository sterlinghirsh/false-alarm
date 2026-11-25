import React from "react";

// The lobby's phrase picker. Closed, it is one row that says what the next game
// deals ("6 of 9 · 106 phrases"); open, a two-column list with a tick per
// category. It sits under the Start button, so opening it never pushes Start
// off the screen. <details> gives the toggle, keyboard and aria-expanded for free.
//
// Lists come in groups. Today there is one, the built-in categories, and a group
// heading shows only when there is more than one, so a later "Your lists" group
// (with an "Add a list" row at its end) slots in as a second entry in `groups`.
function GameSettings({
  allCategories,
  enabledCategories,
  categoryCounts,
  selectedWordCount,
  onCategoryToggle,
  disabled,
}) {
  if (!allCategories || allCategories.length === 0) return null;

  const enabled = enabledCategories || [];
  const enabledSet = new Set(enabled);
  const counts = categoryCounts || {};
  // The server's count: a phrase in two enabled categories counts once.
  const total =
    typeof selectedWordCount === "number"
      ? selectedWordCount
      : enabled.reduce((sum, cat) => sum + (counts[cat] || 0), 0);
  const groups = [{ id: "builtin", label: "Built-in", items: allCategories }];

  return (
    <details className="gameSettings">
      <summary className="gameSettingsHeader">
        <span className="gameSettingsTitle">Categories</span>
        <span className="gameSettingsSummary">
          <span className="categoryCount">
            {enabled.length} of {allCategories.length}
          </span>
          {" · "}
          <span className="categoryPhraseCount">{total} phrases</span>
        </span>
        <svg className="gameSettingsChevron" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M4 2.5 7.5 6 4 9.5" />
        </svg>
      </summary>
      {groups.map((group) => (
        <fieldset key={group.id} className="categoryGroup" disabled={disabled}>
          <legend className={groups.length > 1 ? "categoryGroupLabel" : "visuallyHidden"}>
            {group.label}
          </legend>
          {group.items.map((category) => {
            const checked = enabledSet.has(category);
            // The last ticked category stays ticked: a game needs phrases.
            const isLast = checked && enabled.length === 1;
            return (
              <label
                key={category}
                className="categoryLabel"
                title={isLast ? "At least one category stays on" : undefined}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onCategoryToggle(category)}
                  disabled={isLast}
                />
                <span className="categoryName">{category}</span>
                <span className="categoryPhrases">
                  {counts[category] || 0}
                  <span className="visuallyHidden"> phrases</span>
                </span>
              </label>
            );
          })}
        </fieldset>
      ))}
    </details>
  );
}

export default GameSettings;
