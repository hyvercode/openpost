const test = () => {
  const handleScroll = (e) => {
    if (bgRef.current) bgRef.current.scrollLeft = e.target.scrollLeft;
  }
}
