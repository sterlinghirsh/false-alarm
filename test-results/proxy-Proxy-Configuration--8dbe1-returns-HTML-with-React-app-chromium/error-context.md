# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e6]:
    - heading "False Alarm!" [level=1] [ref=e7]
    - 'heading "Game code: xjct" [level=5] [ref=e8]':
      - text: "Game code:"
      - generic [ref=e9]: xjct
    - 'heading "Invite friends with this link: http://localhost:5000/#xjct" [level=6] [ref=e10]':
      - text: "Invite friends with this link:"
      - link "http://localhost:5000/#xjct" [ref=e11] [cursor=pointer]:
        - /url: http://localhost:5000/#xjct
    - generic [ref=e12]:
      - img "QR Code for game link" [ref=e13]
      - paragraph [ref=e14]: Scan to join the game
    - 'heading "Or join another game: Join" [level=6] [ref=e15]':
      - text: "Or join another game:"
      - generic [ref=e16]:
        - textbox "abcd" [ref=e17]
        - button "Join" [ref=e18]
  - generic [ref=e19]:
    - text: "Players: 1"
    - button "Start Game!" [ref=e20]
  - heading "How to play:" [level=2] [ref=e21]
  - heading "1. Shout the red phrase." [level=3] [ref=e22]:
    - text: 1. Shout the
    - generic [ref=e23]: red
    - text: phrase.
  - heading "2. Listen to other people shout." [level=4] [ref=e24]
  - heading "3. When you hear a phrase, tap it!" [level=4] [ref=e25]
  - heading "Best with 3+ players" [level=5] [ref=e26]
  - link "By Sterling Hirsh" [ref=e27] [cursor=pointer]:
    - /url: http://sterlinghirsh.com/
  - link "sterlinghirsh@gmail.com" [ref=e28] [cursor=pointer]:
    - /url: mailto:sterlinghirsh.com
```