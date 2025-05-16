$(document).ready(function () {
	let db;
	const DB_NAME = "MyRepair";
	const DB_VERSION = 1;
  
	const adminData = {
	  username: "administrator",
	  password: "administrator",
	};
  
	const request = indexedDB.open(DB_NAME, DB_VERSION);
  
	request.onerror = function (event) {
	  console.error("Database error: " + event.target.errorCode);
	};
  
	request.onupgradeneeded = function (event) {
	  db = event.target.result;
	  if (!db.objectStoreNames.contains("users")) {
		db.createObjectStore("users", { keyPath: "username" });
	  }
	  if (!db.objectStoreNames.contains("cards")) {
		const cardsStore = db.createObjectStore("cards", {
		  keyPath: "id",
		  autoIncrement: true,
		});
		cardsStore.createIndex("status", "status", { unique: false });
	  }
	  if (!db.objectStoreNames.contains("currentUser")) {
		db.createObjectStore("currentUser", { keyPath: "id" });
	  }
	};
  
	request.onsuccess = function (event) {
	  db = event.target.result;
	  checkAuth();
  
	  if (window.location.pathname.includes("/cards/")) {
		displayCards();
	  }
	};
  
	$("#register-form").on("submit", function (event) {
	  event.preventDefault();
	  const fio = $("#register-fio").val() + $("#register-name").val() + $("#register-middlename").val();
	  const tel = $("#register-tel").val();
	  const email = $("#register-email").val();
	  const username = $("#register-username").val();
	  const password = $("#register-password").val();
  
	  if (!username || !password || !fio || !tel || !email) {
		alert("Заполните все поля");
		return;
	  }
  
	  const transaction = db.transaction(["users"], "readwrite");
	  const userStore = transaction.objectStore("users");
  
	  const user = { fio, tel, email, username, password };
	  const request = userStore.add(user);
  
	  request.onsuccess = function () {
		alert("Регистрация прошла успешно! Вы можете войти в свой акаунт.");
		window.location.href = "./login/";
	  };
  
	  request.onerror = function () {
		alert(
		  "Ошибка при регистрации. Возможно, такой пользователь уже существует."
		);
	  };
	});
  
	$("#login-form").on("submit", function (event) {
	  event.preventDefault();
  
	  const username = $("#login-username").val();
	  const password = $("#login-password").val();
  
	  if (!username || !password) {
		alert("Заполните все поля.");
		return;
	  }
  
	  if (username === adminData.username && password === adminData.password) {
		setCurrentUser({
		  username: "admin",
		  isAdmin: true,
		  fio: "Администратор",
		  tel: "89991234567",
		  email: "admin@admin.ru",
		});
		return;
	  }
  
	  const transaction = db.transaction(["users"], "readonly");
	  const userStore = transaction.objectStore("users");
	  const request = userStore.get(username);
  
	  request.onsuccess = function (event) {
		const user = event.target.result;
		if (user && password === user.password) {
		  setCurrentUser({
			username: user.username,
			isAdmin: false,
			fio: user.fio,
			tel: user.tel,
			email: user.email,
		  });
		} else {
		  alert("Такого пользователя не существует. Введите корректные данные.");
		}
	  };
  
	  request.onerror = function () {
		alert("Ошибка при входе в систему.");
	  };
	});
  
	function setCurrentUser(user) {
	  const transaction = db.transaction(["currentUser"], "readwrite");
	  const userStore = transaction.objectStore("currentUser");
	  const clearRequest = userStore.clear();
	  clearRequest.onsuccess = function () {
		userStore.add({ id: 1, ...user }).onsuccess = function () {
		  window.location.href = "../cards/";
		};
	  };
	}
  
	$(document).on("click", ".logout-btn", function () {
	  const transaction = db.transaction(["currentUser"], "readwrite");
	  const userStore = transaction.objectStore("currentUser");
	  userStore.clear().onsuccess = function () {
		if (window.location.pathname.split("/").length > 2) {
		  window.location.href = "../";
		} else {
		  window.location.href = "./";
		}
	  };
	});
  
	$(".profile-btn").on("click", function () {
	  $("#profile-dropdown").toggleClass("show");
	});
  
	$("#card-image").on("change", function () {
	  const file = this.files[0];
	  if (file) {
		const reader = new FileReader();
		reader.onload = function (e) {
		  $("#image-preview").attr("src", e.target.result);
		  $("#image-preview-container").show();
		};
		reader.readAsDataURL(file);
	  }
	});
  
	$("#create-form").on("submit", function (event) {
	  event.preventDefault();
	  const address = $("#card-address").val();
	  const type = $("#card-type").val();
	  const date = $("#card-date").val();
	  const time = $("#card-time").val();
	  const pay = $("#card-pay").val();
  
	  if (!address || !type || !date || !time || !pay) {
		alert("Заполните все поля");
		return;
	  }
  
	  saveCard(address, type, date, time, pay);
	});
  
	function saveCard(address, type, date, time, pay) {
	  getCurrentUser(function (currentUser) {
		if (!currentUser) {
		  window.location.href = "../login/";
		  return;
		}
		const transaction = db.transaction(["cards"], "readwrite");
		const cardsStore = transaction.objectStore("cards");
		const newCard = {
		  address,
		  type,
		  date,
		  time,
		  pay,
		  fio: currentUser.fio,
		  tel: currentUser.tel,
		  email: currentUser.email,
		  status: "новое",
		  createdAt: new Date(),
		};
		cardsStore.add(newCard).onsuccess = function () {
		  alert("Успешно!");
		  window.location.href = "../cards/";
		};
	  });
	}
  
	function displayCards() {
	  getCurrentUser(function (currentUser) {
		if (!currentUser) {
		  window.location.href = "../login/";
		  return;
		}
		$("#username").text(currentUser.fio);
		$("#cards-container").empty();
  
		const transaction = db.transaction(["cards"], "readonly");
		const cardsStore = transaction.objectStore("cards");
		cardsStore.getAll().onsuccess = function (event) {
		  const cards = event.target.result;
		  if (cards.length === 0) {
			$("#cards-container").html("<p>Заявок нет. Создайте</p>");
		  } else {
			$.each(cards, function (index, card) {
			  const cardElement = $("<div>").addClass("card");
			  let cardContent = `
							  <h3>Адрес: ${card.address}</h3>
							  <p>Тип ремонта: ${card.type}</p>
							  <p>Дата и время: ${card.date} ${card.time}</p>
							  <p>Заказчик: ${card.fio}</p>
							  <p>Телефон: ${card.tel}</p>
							  <p>Электронная почта: ${card.email}</p>
							  <p>Статус: ${card.status}</p>
						  `;
			  cardElement.html(cardContent);
  
			  if (currentUser.username === "admin") {
				const deleteButton = $("<button>")
				  .text("Удалить")
				  .addClass("delete-button")
				  .data("id", card.id)
				  .on("click", function () {
					deleteCard($(this).data("id"));
				  });
				cardElement.append(deleteButton);
  
				const statusSelect = $("<select>")
				  .addClass("status-select")
				  .data("id", card.id);
				const statuses = ["новое", "в процессе", "завершена", "отменена"];
				$.each(statuses, function (i, status) {
				  const option = $("<option>").val(status).text(status);
				  if (status === card.status) option.prop("selected", true);
				  statusSelect.append(option);
				});
				statusSelect.on("change", function () {
				  changeStatus($(this).data("id"), $(this).val());
				});
				cardElement.append(statusSelect);
			  }
			  $("#cards-container").append(cardElement);
			});
		  }
		};
	  });
	}
  
	function changeStatus(id, newStatus) {
	  const transaction = db.transaction(["cards"], "readwrite");
	  const cardsStore = transaction.objectStore("cards");
	  cardsStore.get(id).onsuccess = function (event) {
		const card = event.target.result;
		card.status = newStatus;
		cardsStore.put(card).onsuccess = function () {
		  displayCards();
		};
	  };
	}
  
	function deleteCard(id) {
	  const transaction = db.transaction(["cards"], "readwrite");
	  const cardsStore = transaction.objectStore("cards");
	  cardsStore.delete(id).onsuccess = function () {
		displayCards();
	  };
	}
  
	function getCurrentUser(callback) {
	  const transaction = db.transaction(["currentUser"], "readonly");
	  const userStore = transaction.objectStore("currentUser");
	  userStore.get(1).onsuccess = function (event) {
		callback(event.target.result);
	  };
	  userStore.get(1).onerror = function () {
		callback(null);
	  };
	}
  
	function checkAuth() {
	  const path = window.location.pathname;
	  const protectedPages = ["/cards/", "/create/"];
	  if (protectedPages.some((page) => path.endsWith(page))) {
		getCurrentUser(function (user) {
		  if (!user) {
			window.location.href = "../login/";
		  }
		});
	  }
	}
  
	$(document).on("click", function (e) {
	  if (!$(e.target).hasClass("profile-btn")) {
		if ($("#profile-dropdown").hasClass("show")) {
		  $("#profile-dropdown").removeClass("show");
		}
	  }
	});
  });
  