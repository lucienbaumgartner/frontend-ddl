// drop-down functionality
function reveal() {
  if (document.getElementById("switch").checked) {
    setTimeout(function() {
      document.getElementById("drop-down").style.visibility = 'visible';
    }, 0);

  }else{
    document.getElementById("drop-down").style.visibility = 'hidden';
  }
}
