import React, { Component } from "react";

class GameSettings extends Component {
  constructor(props) {
    super(props);
    this.state = { expanded: false };
    this.toggleExpanded = this.toggleExpanded.bind(this);
  }

  toggleExpanded() {
    this.setState((prev) => ({ expanded: !prev.expanded }));
  }

  render() {
    const {
      allCategories,
      enabledCategories,
      categoryCounts,
      selectedWordCount,
      onCategoryToggle,
      disabled,
    } = this.props;

    if (!allCategories || allCategories.length === 0) {
      return null;
    }

    const enabledSet = new Set(enabledCategories);
    const isLastEnabled = enabledCategories.length === 1;
    const counts = categoryCounts || {};

    return (
      <div className="gameSettings">
        <div className="gameSettingsHeader" onClick={this.toggleExpanded}>
          <span className="gameSettingsToggle">
            {this.state.expanded ? "▼" : "▶"}
          </span>
          <span className="gameSettingsTitle">
            Word Categories ({selectedWordCount} words selected)
          </span>
        </div>
        {this.state.expanded && (
          <div className="categoryList">
            {allCategories.map((category) => {
              const isChecked = enabledSet.has(category);
              const isDisabled = disabled || (isChecked && isLastEnabled);
              const count = counts[category] || 0;
              return (
                <label key={category} className="categoryLabel">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onCategoryToggle(category)}
                    disabled={isDisabled}
                  />
                  {category} ({count})
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}

export default GameSettings;
