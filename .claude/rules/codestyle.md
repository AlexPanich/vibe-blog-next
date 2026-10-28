When you write conditions, please use next codestyle:

```
if(condition1){

}
else if(condition2){
  
}
else{

}
```

Make empty lines before and after condition.

Loops (`for`, `while`, ...) follow the same style: always use braces, and make empty lines before and after the loop.

The empty lines go **around the block**, separating it from neighbouring statements —
**not inside the braces**. So:

- Do NOT pad the body: no blank line right after the opening `{` or before the closing `}`.
- Do NOT add a blank line before the block when it is the first statement inside its
  enclosing `{` (nothing to separate it from).
- DO add a blank line after the block's closing `}` when more code follows, and before
  the block when a statement precedes it.

## Ordering by visibility: public on top, private at the bottom

Order declarations from most public to most private — the public surface comes first,
internal/helper code last.

- **Class members:** public methods first, then `protected`, then `private`. Don't put
  a `protected`/`private` helper above the public methods it supports.
- **ES module functions:** exported functions on top, non-exported (internal) helpers
  below them.
- **Helper types:** a non-exported type used internally goes below, not crowding the
  top of the file above the class/functions it serves.