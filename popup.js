document.addEventListener('DOMContentLoaded', function () {
  // 모든 카드 창 토글 기능
  document.getElementById('toggleButtons').addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: toggleAllCardContainers,
      })
    })
  })

  document.getElementById('resetSettings').addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: resetSettings,
      })
    })
  })
})

function resetSettings() {
  localStorage.removeItem('cardContainerSettings')
  localStorage.removeItem('containerVisibility')
  window.location.reload()
}

// 페이지에서 실행되는 함수 - 모든 카드 창을 동시에 토글
function toggleAllCardContainers() {
  // 카드 매니저 클래스가 존재하는지 확인
  if (typeof CardManager === 'undefined') {
    console.error('CardManager가 정의되지 않았습니다.')
    return
  }

  // 현재 컨테이너 상태 확인
  const playerContainer = document.getElementById(CardManager.CONTAINER_ID)
  const enemyContainer = document.getElementById(CardManager.ENEMY_CONTAINER_ID)

  // 두 컨테이너 중 하나라도 표시되어 있으면 둘 다 숨기고, 아니면 둘 다 표시
  const shouldShow =
    !playerContainer ||
    !enemyContainer ||
    playerContainer.style.display === 'none' ||
    enemyContainer.style.display === 'none'

  // 창 상태 토글
  if (shouldShow) {
    // 모든 창 표시
    if (playerContainer && playerContainer.style.display === 'none') {
      CardManager.toggleContainer(CardManager.CONTAINER_ID)
    } else if (!playerContainer) {
      CardManager.displayCards()
      CardManager.saveVisibilityState(CardManager.CONTAINER_ID, true)
    }

    if (enemyContainer && enemyContainer.style.display === 'none') {
      CardManager.toggleContainer(CardManager.ENEMY_CONTAINER_ID)
    } else if (!enemyContainer) {
      CardManager.displayEnemyCards()
      CardManager.saveVisibilityState(CardManager.ENEMY_CONTAINER_ID, true)
    }
  } else {
    // 모든 창 숨기기
    if (playerContainer && playerContainer.style.display !== 'none') {
      CardManager.toggleContainer(CardManager.CONTAINER_ID)
    }

    if (enemyContainer && enemyContainer.style.display !== 'none') {
      CardManager.toggleContainer(CardManager.ENEMY_CONTAINER_ID)
    }
  }
}
