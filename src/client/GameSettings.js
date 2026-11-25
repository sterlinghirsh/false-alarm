import React, { useEffect, useRef, useState } from "react";
import {
  LIMITS,
  cleanName,
  copyText,
  deleteList,
  listProblem,
  listText,
  loadLists,
  newListId,
  parsePhrases,
  saveList,
} from "./savedLists";

// A round deals the whole ticked pool among the players; under this many
// phrases each, a round is short.
const FEW_EACH = 8;

// The lobby's phrase picker. Closed, it is one row that says what the next game
// deals ("6 of 9 · 106 phrases"); open, the built-in categories in two columns,
// then "Your lists": lists added to this game (by anyone) and lists saved on
// this phone, each a tick, and an "Add a list" row that opens a sheet. It sits
// under the Start button, so opening it never pushes Start off the screen.
function GameSettings({
  allCategories,
  enabledCategories,
  categoryCounts,
  selectedWordCount,
  onCategoryToggle,
  disabled,
  customLists,
  onAddList,
  onUpdateList,
  onRemoveList,
  playerCount,
}) {
  const [saved, setSaved] = useState(loadLists);
  const [sheet, setSheet] = useState(null); // { list, key } while open

  if (!allCategories || allCategories.length === 0) return null;

  const enabled = enabledCategories || [];
  const enabledSet = new Set(enabled);
  const counts = categoryCounts || {};
  const gameLists = customLists || [];
  // The server's count: a phrase in two enabled categories counts once.
  const total =
    typeof selectedWordCount === "number"
      ? selectedWordCount
      : enabled.reduce((sum, cat) => sum + (counts[cat] || 0), 0);
  const players = Math.max(1, playerCount || 1);
  const each = Math.floor(total / players);
  const few = each < FEW_EACH;

  // This phone's saved lists that are already in the game show as the game's row.
  const inGame = new Map(gameLists.filter((l) => l.mine && l.clientId).map((l) => [l.clientId, l]));
  const savedOnly = saved.filter((l) => !inGame.has(l.id));
  const savedById = new Map(saved.map((l) => [l.id, l]));

  const openSheet = (list, key) => setSheet({ list, key });
  const closeSheet = () => setSheet(null);

  const handleSave = (list, key, isNew) => {
    setSaved(saveList(list));
    if (isNew) onAddList && onAddList(list);
    else if (key) onUpdateList && onUpdateList(key, list);
    closeSheet();
  };
  const handleDelete = (list, key) => {
    setSaved(deleteList(list.id));
    if (key) onRemoveList && onRemoveList(key);
    closeSheet();
  };

  const row = ({ id, checked, onChange, name, count, isLast, edit }) => (
    <div key={id} className="listRow">
      <label className="categoryLabel" title={isLast ? "At least one category stays on" : undefined}>
        <input type="checkbox" checked={checked} onChange={onChange} disabled={isLast} />
        <span className="categoryName">{name}</span>
        <span className="categoryPhrases">
          {count}
          <span className="visuallyHidden"> phrases</span>
        </span>
      </label>
      {edit ? (
        <button type="button" className="listEdit" onClick={edit} aria-label={`Edit ${name}`}>
          Edit
        </button>
      ) : (
        <span className="listEditSpace" />
      )}
    </div>
  );

  return (
    <details className="gameSettings">
      <summary className="gameSettingsHeader">
        <span className="gameSettingsTitle">Categories</span>
        <span className="gameSettingsSummary">
          <span className="categoryCount">
            {enabled.length} of {allCategories.length + gameLists.length}
          </span>
          {" · "}
          <span className={few ? "categoryPhraseCount isFew" : "categoryPhraseCount"}>{total} phrases</span>
        </span>
        <svg className="gameSettingsChevron" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M4 2.5 7.5 6 4 9.5" />
        </svg>
      </summary>
      <p className={few ? "poolHint isFew" : "poolHint"} aria-live="polite">
        {few
          ? `Only about ${each} each for ${players} player${players === 1 ? "" : "s"}: tick more for a longer round.`
          : `About ${each} each for ${players} player${players === 1 ? "" : "s"}.`}
      </p>
      <fieldset className="categoryGroup" disabled={disabled}>
        <legend className="categoryGroupLabel">Built-in</legend>
        {allCategories.map((category) => {
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
      <fieldset className="categoryGroup yourLists" disabled={disabled}>
        <legend className="categoryGroupLabel">Your lists</legend>
        {gameLists.map((l) => {
          const checked = enabledSet.has(l.key);
          const mineSaved = l.mine && savedById.get(l.clientId);
          return row({
            id: l.key,
            checked,
            onChange: () => onCategoryToggle(l.key),
            name: l.name,
            count: l.count,
            isLast: checked && enabled.length === 1,
            edit: mineSaved ? () => openSheet(mineSaved, l.key) : null,
          });
        })}
        {savedOnly.map((l) =>
          row({
            id: l.id,
            checked: false,
            onChange: () => onAddList && onAddList(l),
            name: l.name,
            count: l.phrases.length,
            edit: () => openSheet(l, null),
          }),
        )}
        <button type="button" className="addListRow" onClick={() => openSheet(null, null)}>
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M6 2v8M2 6h8" />
          </svg>
          Add a list
        </button>
      </fieldset>
      {sheet && (
        <ListSheet
          list={sheet.list}
          gameKey={sheet.key}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closeSheet}
        />
      )}
    </details>
  );
}

// The sheet for adding or editing a list: a name, and phrases one per line.
function ListSheet({ list, gameKey, onSave, onDelete, onClose }) {
  const isNew = !list;
  const [name, setName] = useState(list ? list.name : "");
  const [text, setText] = useState(list ? listText(list) : "");
  const [copied, setCopied] = useState(false);
  const [tried, setTried] = useState(false);
  const opener = useRef(null);

  useEffect(() => {
    opener.current = document.activeElement;
    return () => opener.current && opener.current.focus && opener.current.focus();
  }, []);

  const phrases = parsePhrases(text);
  const cleaned = cleanName(name);
  const problem = listProblem(cleaned, phrases);

  const save = (e) => {
    e.preventDefault();
    setTried(true);
    if (problem) return;
    onSave({ id: list ? list.id : newListId(), name: cleaned, phrases }, gameKey, isNew);
  };
  const copy = async () => {
    setCopied(await copyText(phrases.join("\n")));
  };

  return (
    <div className="listSheetLayer" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="listSheetScrim" onClick={onClose} />
      <form className="listSheet" role="dialog" aria-modal="true" aria-labelledby="listSheetTitle" onSubmit={save}>
        <h2 id="listSheetTitle" className="listSheetTitle">{isNew ? "New list" : "Edit list"}</h2>
        <label className="listField">
          <span>Name</span>
          <input
            className="listName"
            value={name}
            maxLength={LIMITS.nameLength}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sterling's list"
            autoFocus
            autoComplete="off"
          />
        </label>
        <label className="listField">
          <span>Phrases, one per line</span>
          <textarea
            className="listPhrases"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setCopied(false);
            }}
            rows={8}
            placeholder={"Where's the cat?\nWho ate the pie?"}
          />
        </label>
        <p className={tried && problem ? "listStatus isError" : "listStatus"} aria-live="polite">
          {tried && problem
            ? problem
            : `${phrases.length} phrase${phrases.length === 1 ? "" : "s"} · saved on this phone`}
        </p>
        <div className="listActions">
          {!isNew && (
            <button type="button" className="listDelete" onClick={() => onDelete(list, gameKey)}>
              Delete
            </button>
          )}
          {phrases.length > 0 && (
            <button type="button" className="listCopy" onClick={copy}>
              {copied ? "Copied" : "Copy list"}
            </button>
          )}
          <span className="listActionsGap" />
          <button type="button" className="listCancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="listSave">
            {isNew ? "Add" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default GameSettings;
