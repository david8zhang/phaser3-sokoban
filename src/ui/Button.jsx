const primaryButton = (text = 'Play') => {
  return (
    <button style='width:200px' class='button is-primary is-medium'>
      {text}
    </button>
  )
}

const defaultButton = (text = 'Play') => {
  return (
    <button style='width:200px' class='button is-medium'>
      {text}
    </button>
  )
}

export { primaryButton, defaultButton }
